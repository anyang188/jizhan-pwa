/**
 * 链接健康检测模块
 * 使用 CORS 代理中转 HEAD 请求检测链接有效性
 * 结果缓存到 localStorage，7天有效期
 */

(function() {
  'use strict';

  // ===== 常量 =====
  var CACHE_KEY = 'jizhan_link_checker_cache';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7天毫秒
  var TIMEOUT_MS = 3000; // 3秒超时
  var CONCURRENT_LIMIT = 6; // 最大并发6条
  var PROXY_PRIMARY = 'https://api.allorigins.win/head?url=';
  var PROXY_FALLBACK = 'https://corsproxy.io/?';

  // ===== 状态 =====
  var cache = {}; // { url: { status: 'ok'|'fail'|'unknown', time: timestamp } }
  var checkingQueue = []; // 待检测的URL数组
  var activeChecks = 0; // 当前正在进行的检测数
  var onProgress = null; // 进度回调 (current, total)
  var onComplete = null; // 完成回调 (results: {url, status})

  // ===== localStorage 缓存读写 =====
  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch(e) {
      return {};
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch(e) {}
  }

  function getCacheStatus(url) {
    var entry = cache[url];
    if (!entry) return null;
    var now = Date.now();
    if (now - entry.time > CACHE_TTL) {
      delete cache[url];
      saveCache();
      return null;
    }
    return entry.status;
  }

  function setCacheStatus(url, status) {
    cache[url] = { status: status, time: Date.now() };
    saveCache();
  }

  // ===== 单个链接检测 =====
  function checkSingleUrl(url) {
    return new Promise(function(resolve) {
      var cached = getCacheStatus(url);
      if (cached !== null) {
        resolve(cached);
        return;
      }

      // 优先主代理，失败切备用
      checkWithProxy(url, PROXY_PRIMARY, function(result) {
        if (result === 'ok' || result === 'fail') {
          resolve(result);
          return;
        }
        // 主代理失败，切备用
        checkWithProxy(url, PROXY_FALLBACK, function(result2) {
          resolve(result2 || 'unknown');
        });
      });
    });
  }

  function checkWithProxy(url, proxyBase, callback) {
    var timer;
    var done = false;

    function finish(status) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      callback(status);
    }

    var proxyUrl = proxyBase + encodeURIComponent(url);
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', proxyUrl, true);
    xhr.timeout = TIMEOUT_MS;

    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 400) {
          finish('ok');
        } else if (xhr.status >= 400) {
          finish('fail');
        } else {
          // readyState=4 but not 200-399 and not >=400, treat as unknown
          finish('unknown');
        }
      }
    };

    xhr.onerror = function() {
      finish('unknown');
    };

    xhr.ontimeout = function() {
      finish('unknown');
    };

    timer = setTimeout(function() {
      try { xhr.abort(); } catch(e) {}
      finish('unknown');
    }, TIMEOUT_MS + 500);

    try {
      xhr.send();
    } catch(e) {
      finish('unknown');
    }
  }

  // ===== 请求队列（并发限制） =====
  function processQueue() {
    if (checkingQueue.length === 0) {
      // 队列空了，所有检测完成
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // 还有空闲槽位
    while (checkingQueue.length > 0 && activeChecks < CONCURRENT_LIMIT) {
      activeChecks++;
      var url = checkingQueue.shift();

      checkSingleUrl(url).then(function(status) {
        setCacheStatus(url, status);
        if (onProgress) {
          onProgress(checkingQueue.length === 0 ? getTotalChecked() : getTotalChecked() - activeChecks, getTotalChecked());
        }
        activeChecks--;
        processQueue();
      });
    }
  }

  function getTotalChecked() {
    // 已完成的 + 队列中剩余的 + 活跃中的
    return _totalExpected;
  }
  var _totalExpected = 0;

  // ===== 对外接口 =====

  /**
   * 批量检测一组 URL
   * @param {string[]} urls - URL 数组
   * @param {Function} onProgressCb - 进度回调 (已完成数, 总数)
   * @param {Function} onCompleteCb - 完成回调
   * @returns {Promise<void>}
   */
  function checkUrls(urls, onProgressCb, onCompleteCb) {
    onProgress = onProgressCb || function() {};
    onComplete = onCompleteCb || function() {};
    cache = loadCache(); // 重新加载最新缓存
    checkingQueue = urls.slice(); // 复制数组
    _totalExpected = urls.length;
    activeChecks = 0;
    processQueue();
  }

  /**
   * 获取某个 URL 的检测结果
   * @param {string} url
   * @returns {string|null} 'ok' | 'fail' | 'unknown' | null(未检测)
   */
  function getStatus(url) {
    var c = cache[url];
    if (!c) return null;
    var now = Date.now();
    if (now - c.time > CACHE_TTL) {
      return null;
    }
    return c.status;
  }

  /**
   * 清除某个 URL 的检测缓存
   */
  function clearCache(url) {
    if (cache[url]) {
      delete cache[url];
      saveCache();
    }
  }

  /**
   * 清除所有检测缓存
   */
  function clearAllCache() {
    cache = {};
    try { localStorage.removeItem(CACHE_KEY); } catch(e) {}
  }

  /**
   * 获取统计信息（基于指定的URL列表，避免统计已删除的旧链接）
   * @param {string[]} [urlList] - 可选，指定URL列表；不传则统计整个缓存
   */
  function getStats(urlList) {
    var ok = 0, fail = 0, unknown = 0;
    var now = Date.now();
    var urls = urlList || Object.keys(cache);
    for (var i = 0; i < urls.length; i++) {
      var url = urls[i];
      var entry = cache[url];
      if (!entry) continue;
      if (now - entry.time > CACHE_TTL) continue;
      if (entry.status === 'ok') ok++;
      else if (entry.status === 'fail') fail++;
      else unknown++;
    }
    return { ok: ok, fail: fail, unknown: unknown, total: ok + fail + unknown };
  }

  window.LinkChecker = {
    checkUrls: checkUrls,
    getStatus: getStatus,
    clearCache: clearCache,
    clearAllCache: clearAllCache,
    getStats: getStats
  };

})();
