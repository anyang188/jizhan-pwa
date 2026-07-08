/**
 * 集站 PWA 主逻辑
 * 从微信小程序迁移，wx.xxx → Web API
 */

(function() {
'use strict';

// ===== 常量 =====
var VERSION = 'v5';
var ICON_OPTIONS = ['🤖','🎨','📊','💻','🔍','📺','💬','🛒','🖌️','☁️','📰','📁',
  '⭐','🔥','🎯','⚡','🎮','🎵','📷','🌐','✉️','📱','🔧','💡','📚','💰','🏠','🗺️','📝','🎬','🎧','🏆','🥇','🛡️','🧰','🗂️','📌','🎈','🧩','🪄','🎪'];

var THEMES = [
  { id: 'clean', name: '纯净白', color: '#F5F6FA',
    css: { '--bg': '#F5F6FA', '--card-bg': '#FFFFFF', '--text': '#2C3E50',
      '--text-secondary': '#7F8C9B', '--border': '#E8ECF1', '--shadow': '0 2px 12px rgba(0,0,0,0.06)',
      '--header-bg': 'linear-gradient(135deg, var(--primary) 0%, #6C8CFF 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#F5F6FA', cardBg: '#FFFFFF', text: '#2C3E50' } },
  { id: 'dark', name: '暗夜黑', color: '#111111',
    css: { '--bg': '#0a0a0a', '--card-bg': '#1a1a1a', '--text': '#e0e0e0',
      '--text-secondary': '#a0a0a0', '--border': '#2a2a2a', '--shadow': '0 2px 12px rgba(0,0,0,0.3)',
      '--header-bg': 'linear-gradient(135deg, #333333 0%, #1a1a1a 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#0a0a0a', cardBg: '#1a1a1a', text: '#e0e0e0' } },
  { id: 'custom', name: '自定义', color: '#4F6EF7',
    css: { '--bg': '#F0F4FF', '--card-bg': '#FFFFFF', '--text': '#2C3E50',
      '--text-secondary': '#7F8C9B', '--border': '#E8ECF1', '--shadow': '0 2px 12px rgba(0,0,0,0.06)',
      '--header-bg': 'linear-gradient(135deg, var(--primary) 0%, #6C8CFF 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#F0F4FF', cardBg: '#FFFFFF', text: '#2C3E50' } }
];

// ===== 状态 =====
var state = {
  siteTitle: '我的导航站',
  siteSubtitle: '',
  parsedCount: 0,
  classifiedData: [],
  hasParsed: false,
  currentTheme: 'clean',
  themeStyle: { bg: '#F5F6FA', cardBg: '#FFFFFF', text: '#2C3E50' },
  editingCategoryIndex: -1,
  moveCatIndex: -1,
  moveSiteIndex: -1,
  // 链接检测筛选
  linkCheckFilter: 'all', // 'all' | 'ok' | 'fail'
  linkChecking: false
};

// ===== localStorage 持久化 =====
var STORAGE_KEY = 'jizhan_state';

function saveState() {
  try {
    var data = {
      siteTitle: state.siteTitle,
      siteSubtitle: state.siteSubtitle,
      classifiedData: state.classifiedData,
      hasParsed: state.hasParsed,
      currentTheme: state.currentTheme,
      parsedCount: state.parsedCount
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);
    if (!data || !data.hasParsed) return false;
    state.siteTitle = data.siteTitle || '我的导航站';
    state.siteSubtitle = data.siteSubtitle || '';
    state.classifiedData = data.classifiedData || [];
    state.hasParsed = data.hasParsed || false;
    state.currentTheme = data.currentTheme || 'clean';
    state.parsedCount = data.parsedCount || 0;
    // 恢复主题样式
    var theme = THEMES.find(function(t) { return t.id === state.currentTheme; });
    if (theme) {
      state.themeStyle = theme.preview;
    } else if (customThemeColor) {
      var ct = generateCustomTheme(customThemeColor);
      state.themeStyle = ct.preview;
    }
    return true;
  } catch(e) {
    return false;
  }
}

function clearPersistedState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
}

// ===== 工具函数 =====
function $(id) { return document.getElementById(id); }
function escapeHtml(s) { return HtmlGenerator.escapeHtml(s); }
function escapeAttr(s) { return HtmlGenerator.escapeAttr(s); }

function hexToRgba(hex, alpha) {
  var h = (hex || '#4F6EF7').replace('#', '');
  if (h.length === 3) h = h.split('').map(function(c){return c+c;}).join('');
  var r = parseInt(h.substring(0,2), 16);
  var g = parseInt(h.substring(2,4), 16);
  var b = parseInt(h.substring(4,6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// Toast 提示
function showToast(title, icon) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = (icon === 'success' ? '✅ ' : icon === 'error' ? '❌ ' : '') + title;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 2000);
}

// 自定义确认弹窗（替代 wx.showModal 确认模式）
function showConfirm(title, content, opts) {
  opts = opts || {};
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML =
      '<div class="confirm-modal">' +
        '<div class="confirm-title">' + escapeHtml(title) + '</div>' +
        '<div class="confirm-content">' + escapeHtml(content) + '</div>' +
        '<div class="confirm-btns">' +
          (opts.showCancel === false ? '' :
            '<button class="confirm-btn confirm-btn-cancel" data-act="cancel">' +
              escapeHtml(opts.cancelText || '取消') + '</button>') +
          '<button class="confirm-btn confirm-btn-confirm" data-act="confirm">' +
            escapeHtml(opts.confirmText || '确定') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      var act = e.target.getAttribute('data-act');
      if (act) {
        overlay.remove();
        resolve(act === 'confirm');
      } else if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

// 自定义输入弹窗（替代 wx.showModal editable 模式）
function showPrompt(title, defaultValue, placeholder) {
  return new Promise(function(resolve) {
    var overlay = document.createElement('div');
    overlay.className = 'prompt-overlay';
    overlay.innerHTML =
      '<div class="prompt-modal">' +
        '<div class="prompt-title">' + escapeHtml(title) + '</div>' +
        '<input class="prompt-input" id="promptInput" value="' + escapeAttr(defaultValue || '') + '" placeholder="' + escapeAttr(placeholder || '') + '">' +
        '<div class="prompt-btns">' +
          '<button class="prompt-btn prompt-btn-cancel" data-act="cancel">取消</button>' +
          '<button class="prompt-btn prompt-btn-confirm" data-act="confirm">确定</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var input = overlay.querySelector('#promptInput');
    input.focus();
    input.select();
    overlay.addEventListener('click', function(e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'confirm') {
        var val = input.value.trim();
        overlay.remove();
        resolve(val);
      } else if (act === 'cancel') {
        overlay.remove();
        resolve(null);
      } else if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        var val = input.value.trim();
        overlay.remove();
        resolve(val);
      }
    });
  });
}

// ===== 自定义主题 =====
var customThemeColor = null;
try { customThemeColor = localStorage.getItem('jizhan_theme_color'); } catch(e) {}

function lightenColor(hex, amt) {
  var r = parseInt(hex.substring(1,3), 16);
  var g = parseInt(hex.substring(3,5), 16);
  var b = parseInt(hex.substring(5,7), 16);
  r = Math.min(255, r + amt);
  g = Math.min(255, g + amt);
  b = Math.min(255, b + amt);
  return '#' + [r,g,b].map(function(v){ return v.toString(16).padStart(2,'0'); }).join('');
}

function generateCustomTheme(hexColor) {
  var c = hexColor || '#4F6EF7';
  var r = parseInt(c.substring(1,3), 16);
  var g = parseInt(c.substring(3,5), 16);
  var b = parseInt(c.substring(5,7), 16);
  var lightBg = 'rgb(' + Math.min(255, r + 100) + ',' + Math.min(255, g + 100) + ',' + Math.min(255, b + 100) + ')';
  return {
    id: 'custom', name: '自定义', color: c,
    css: {
      '--bg': lightBg, '--card-bg': '#FFFFFF', '--text': '#2C3E50',
      '--text-secondary': '#6B7280', '--border': 'rgba(' + r + ',' + g + ',' + b + ',0.25)',
      '--shadow': '0 2px 12px rgba(0,0,0,0.06)',
      '--header-bg': 'linear-gradient(135deg, ' + c + ' 0%, ' + lightenColor(c, 40) + ' 100%)',
      '--header-text': '#ffffff'
    },
    preview: { bg: lightBg, cardBg: '#FFFFFF', text: '#2C3E50' }
  };
}

// ===== HSL 取色器 =====
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  var a = s * Math.min(l, 1 - l);
  var f = function(n) {
    var k = (n + h / 30) % 12;
    var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

var colorPickerState = { hue: 0, saturation: 50, lightness: 50 };
var TRACK_HEIGHT = 200;
var THUMB_HEIGHT = 24;
var MAX_Y = TRACK_HEIGHT - THUMB_HEIGHT;





function hexToHsl(hex) {
  var h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  var r = parseInt(h.substring(0,2), 16) / 255;
  var g = parseInt(h.substring(2,4), 16) / 255;
  var b = parseInt(h.substring(4,6), 16) / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  var h2 = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h2 = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h2 = ((b - r) / d + 2) * 60;
    else h2 = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h2), s: Math.round(s * 100), l: Math.round(l * 100) };
}








function applyThemeCSS(cssObj) {
  var root = document.documentElement.style;
  for (var key in cssObj) {
    if (cssObj.hasOwnProperty(key)) {
      root.setProperty('--' + key, cssObj[key]);
    }
  }
}

// ===== 主题渲染 =====
function renderThemes() {
  var html = '';
  THEMES.forEach(function(t) {
    var active = state.currentTheme === t.id;
    var isCustom = t.id === 'custom';
    var bg = isCustom ? (customThemeColor || 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)') : t.color;
    var border = isCustom ? '' : 'border:1.5px solid #E5E7EB;';
    var customAttr = isCustom ? ' data-custom="1"' : '';
    html += '<div class="theme-item ' + (active ? 'theme-active' : '') + '" data-theme="' + t.id + '"' + customAttr + '>' +
      '<div class="theme-color" style="background:' + bg + ';' + border + '">' +
        '<span class="theme-icon">' + (active ? 'V' : '') + '</span>' +
      '</div>' +
      '<span class="theme-name">' + t.name + '</span>' +
    '</div>';
  });

  var picker = $('themePicker');
  picker.innerHTML = html;

  // 预设主题点击
  picker.querySelectorAll('.theme-item[data-theme]').forEach(function(item) {
    item.addEventListener('click', function() {
      var themeId = this.getAttribute('data-theme');
      var isCustom = this.getAttribute('data-custom') === '1';
      // 自定义按钮：打开 HSL 取色器
      if (isCustom) {
        openColorPicker();
        return;
      }
      var theme = THEMES.find(function(t) { return t.id === themeId; });
      if (!theme) return;
      state.currentTheme = themeId;
      state.themeStyle = theme.preview;
      // 自定义主题更新 CSS
      if (themeId === 'custom' && customThemeColor) {
        var ct = generateCustomTheme(customThemeColor);
        state.themeStyle = ct.preview;
        applyThemeCSS(ct.css);
      } else {
        applyThemeCSS(theme.css);
      }
      renderThemes();
      updatePreviewColors();
      saveState();
    });
  });
}

function updatePreviewColors() {
  var card = $('previewCard');
  if (card.style.display !== 'none') {
    card.style.background = state.themeStyle.cardBg;
    $('previewTitle').style.color = state.themeStyle.text;
  }
  // 空状态跟随主题变化
  var emptyState = $('emptyState');
  if (emptyState) {
    var emptyTitle = emptyState.querySelector('.empty-title');
    var emptyDesc = emptyState.querySelector('.empty-desc');
    if (emptyTitle) emptyTitle.style.color = state.themeStyle.text;
    if (emptyDesc) emptyDesc.style.color = state.themeStyle.text ? state.themeStyle.text + '99' : '';
  }
  $('app').style.background = state.themeStyle.bg;
}

// ===== 分类预览渲染 =====
function getAllUrls() {
  var urls = [];
  state.classifiedData.forEach(function(cat) {
    cat.sites.forEach(function(site) {
      if (site.url) urls.push(site.url);
    });
  });
  return urls;
}

function collectFailedUrls() {
  var failed = [];
  state.classifiedData.forEach(function(cat) {
    cat.sites.forEach(function(site) {
      var st = LinkChecker.getStatus(site.url);
      // fail/unknown/null(未检测) 都视为异常
      if (st !== 'ok') {
        failed.push(site.url);
      }
    });
  });
  return failed;
}

function renderClassifiedData() {
  var data = state.classifiedData;
  if (data.length === 0) {
    $('previewCard').style.display = 'none';
    $('emptyState').style.display = state.hasParsed ? 'none' : 'block';
    return;
  }

  // 计算总网站数
  var totalSites = 0;
  data.forEach(function(cat) { totalSites += cat.sites.length; });

  $('previewCard').style.display = 'block';
  $('emptyState').style.display = 'none';
  $('previewHint').textContent = totalSites + ' 个站点 · ' + data.length + ' 个分类';
  $('previewCard').style.background = state.themeStyle.cardBg;
  $('previewTitle').style.color = state.themeStyle.text;

  // 渲染检测工具栏
  renderCheckToolbar(totalSites);

  var html = '';
  data.forEach(function(cat, catIndex) {
    html += '<div class="category-item">';
    html += '<div class="cat-header">';
    html += '<span class="cat-icon editable" data-act="editIcon" data-index="' + catIndex + '">' + cat.categoryIcon + '</span>';
    html += '<span class="cat-name editable" style="color:' + state.themeStyle.text + ';" data-act="editName" data-index="' + catIndex + '">' + escapeHtml(cat.categoryName || '未命名分类') + '</span>';
    html += '<span class="cat-count">' + cat.sites.length + ' 个</span>';
    html += '<div class="cat-actions">';
    if (catIndex > 0) html += '<span class="move-btn" data-act="moveCat" data-index="' + catIndex + '" data-dir="up">&#8593;</span>';
    if (catIndex < data.length - 1) html += '<span class="move-btn" data-act="moveCat" data-index="' + catIndex + '" data-dir="down">&#8595;</span>';
    html += '</div></div>';
    html += '<div class="cat-sites">';
    cat.sites.forEach(function(site, siteIndex) {
      var status = LinkChecker.getStatus(site.url);
      var dotHtml = '';
      if (status === 'ok') {
        dotHtml = '<span class="status-dot status-ok" title="正常"></span>';
      } else if (status === 'fail') {
        dotHtml = '<span class="status-dot status-fail" title="失效"></span>';
      } else if (status === 'unknown') {
        dotHtml = '<span class="status-dot status-unknown" title="无法检测"></span>';
      } else {
        // 未检测/null → 强制显示待检测灰色圆点
        dotHtml = '<span class="status-dot status-unknown" title="待检测"></span>';
      }
      html += '<div class="cat-site">';
      html += dotHtml;
      html += '<span class="site-icon editable" data-act="editSiteIcon" data-cat="' + catIndex + '" data-site="' + siteIndex + '">' + escapeHtml(site.icon) + '</span>';
      html += '<span class="site-name editable" data-act="editSiteName" data-cat="' + catIndex + '" data-site="' + siteIndex + '">' + escapeHtml(site.name) + '</span>';
      html += '<span class="site-action-btn" data-act="siteAction" data-cat="' + catIndex + '" data-site="' + siteIndex + '">&#8645;</span>';
      html += '</div>';
    });
    html += '</div></div>';
  });
  $('categoryList').innerHTML = html;

  // 绑定事件
  $('categoryList').querySelectorAll('[data-act]').forEach(function(el) {
    el.addEventListener('click', handleCategoryAction);
  });
}

// ===== 检测工具栏渲染 =====
function renderCheckToolbar(totalSites) {
  var toolbar = $('checkToolbar');
  if (!toolbar) return;

  // 获取当前页面所有URL，用于精准统计
  var currentUrls = getAllUrls();
  var stats = LinkChecker.getStats(currentUrls);
  // 安全数值兜底
  var sOk = typeof stats.ok === 'number' ? stats.ok : 0;
  var sFail = typeof stats.fail === 'number' ? stats.fail : 0;
  var sUnknown = typeof stats.unknown === 'number' ? stats.unknown : 0;
  var sTotal = typeof stats.total === 'number' ? stats.total : 0;
  // 未检测数量 = 总链接数 - 已检测数
  var unchecked = Math.max(0, totalSites - sTotal);

  var filterBtns = '';
  var filters = [
    { key: 'all', label: '全部 (' + totalSites + ')' },
    { key: 'ok', label: '正常 (' + sOk + ')' },
    { key: 'fail', label: '异常 (' + (sFail + sUnknown + unchecked) + ')' }
  ];
  filters.forEach(function(f) {
    var cls = state.linkCheckFilter === f.key ? 'check-filter-btn check-filter-active' : 'check-filter-btn';
    filterBtns += '<button class="' + cls + '" data-filter="' + f.key + '">' + f.label + '</button>';
  });

  var checkBtnText = state.linkChecking ? '检测中…' : '批量校验';
  var checkBtnCls = state.linkChecking ? 'btn-check check-disabled' : 'btn-check';

  var hasFailed = (sFail + sUnknown + unchecked) > 0;
  var actionHtml = '';
  if (hasFailed) {
    actionHtml =
      '<div class="check-row-bot">' +
        '<div class="check-filters">' + filterBtns + '</div>' +
        '<div class="more-dropdown" id="moreDropdown">' +
          '<button class="btn-more" id="moreBtn">异常管理</button>' +
          '<div class="more-menu" id="moreMenu">' +
            '<div class="more-menu-item" id="copyMenuItem">📋 复制异常链接</div>' +
            '<div class="more-menu-item" id="isolateMenuItem">📦 隔离异常链接</div>' +
            '<div class="more-menu-item more-danger" id="removeMenuItem">🗑 清理异常链接</div>'
          '</div>' +
        '</div>' +
      '</div>';
  }

  toolbar.innerHTML =
    '<div class="check-toolbar">' +
      '<div class="check-row-top">' +
        '<span class="check-info">🔗 链接健康检测</span>' +
        '<button class="' + checkBtnCls + '" id="batchCheckBtn">' + checkBtnText + '</button>' +
      '</div>' +
      '<div class="check-progress" id="checkProgress" style="display:none;">' +
        '<div class="check-progress-bar" id="checkProgressBar"></div>' +
        '<span class="check-progress-text" id="checkProgressText">0%</span>' +
      '</div>' +
      actionHtml +
    '</div>';

  // 批量校验按钮
  var batchBtn = toolbar.querySelector('#batchCheckBtn');
  if (batchBtn) {
    batchBtn.addEventListener('click', function() {
      if (state.linkChecking) return;
      startBatchCheck();
    });
  }

  // 异常管理下拉菜单开关
  var moreBtn = toolbar.querySelector('#moreBtn');
  var moreMenu = toolbar.querySelector('#moreMenu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      moreMenu.classList.toggle('open');
    });
    // 点击外部关闭下拉菜单
    document.addEventListener('click', function closeMenu(ev) {
      if (!toolbar.contains(ev.target)) {
        moreMenu.classList.remove('open');
        document.removeEventListener('click', closeMenu);
      }
    });
  }

  // 复制失效链接（从下拉菜单）
  var copyItem = toolbar.querySelector('#copyMenuItem');
  if (copyItem) {
    copyItem.addEventListener('click', function() {
      moreMenu.classList.remove('open');
      copyFailedUrls();
    });
  }

  // 隔离异常（从下拉菜单）
  var isolateItem = toolbar.querySelector('#isolateMenuItem');
  if (isolateItem) {
    isolateItem.addEventListener('click', function() {
      moreMenu.classList.remove('open');
      isolateFailedSites();
    });
  }

  // 清理异常（从下拉菜单，带确认弹窗）
  var removeItem = toolbar.querySelector('#removeMenuItem');
  if (removeItem) {
    removeItem.addEventListener('click', function() {
      moreMenu.classList.remove('open');
      showConfirm('确认清理异常链接', '确认删除所有异常链接？\n\n注：异常不代表网站失效，可能是 CORS 代理无法访问导致的误判。清理后不可恢复，确定要删除这些链接吗？', {
        confirmText: '确认清理',
        cancelText: '取消'
      }).then(function(confirmed) {
        if (confirmed) {
          removeFailedSites();
        }
      });
    });
  }

  // 筛选按钮
  toolbar.querySelectorAll('.check-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      state.linkCheckFilter = this.getAttribute('data-filter');
      renderCheckToolbar(totalSites);
      applyFilter();
    });
  });
}

function applyFilter() {
  var items = document.querySelectorAll('.category-item');
  items.forEach(function(item) {
    var sites = item.querySelectorAll('.cat-site');
    var visibleCount = 0;
    sites.forEach(function(siteEl) {
      var dot = siteEl.querySelector('.status-dot');
      if (!dot) {
        // 未检测状态
        if (state.linkCheckFilter === 'all') {
          siteEl.style.display = '';
          visibleCount++;
        } else if (state.linkCheckFilter === 'fail') {
          // 未检测视为异常
          siteEl.style.display = '';
          visibleCount++;
        } else {
          siteEl.style.display = 'none';
        }
        return;
      }
      var cls = dot.className;
      var show = false;
      if (state.linkCheckFilter === 'all') {
        show = true;
      } else if (state.linkCheckFilter === 'ok' && cls.indexOf('status-ok') !== -1) {
        show = true;
      } else if (state.linkCheckFilter === 'fail' && (cls.indexOf('status-fail') !== -1 || cls.indexOf('status-unknown') !== -1)) {
        show = true;
      }
      siteEl.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });
    // 如果分类下所有站点都被过滤了，隐藏该分类
    var header = item.querySelector('.cat-header');
    if (header) {
      header.style.display = visibleCount > 0 ? '' : 'none';
    }
    var sitesWrap = item.querySelector('.cat-sites');
    if (sitesWrap) {
      sitesWrap.style.display = visibleCount > 0 ? '' : 'none';
    }
  });
}

function startBatchCheck() {
  var urls = getAllUrls();
  if (urls.length === 0) {
    showToast('没有可检测的链接', 'error');
    return;
  }

  state.linkChecking = true;

  LinkChecker.checkUrls(urls, function(current, total) {
    var pct = Math.round((current / total) * 100);
    var progressBar = document.getElementById('checkProgressBar');
    var progressText = document.getElementById('checkProgressText');
    var progressWrap = document.getElementById('checkProgress');
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = pct + '%';
    if (progressWrap) progressWrap.style.display = 'block';
  }, function() {
    state.linkChecking = false;
    var progressWrap = document.getElementById('checkProgress');
    if (progressWrap) progressWrap.style.display = 'none';
    renderClassifiedData();
    saveState();
    var finalStats = LinkChecker.getStats(getAllUrls());
    showToast('检测完成！正常 ' + finalStats.ok + ' 个，异常 ' + (finalStats.fail + finalStats.unknown) + ' 个', 'success');
  });
}

/**
 * 预校验（导入后自动调用，不阻塞UI，不显示进度条）
 */
function startPreCheck(urls) {
  LinkChecker.checkUrls(urls, function() {}, function() {
    // 预校验完成，静默刷新分类预览（显示红绿点）
    if (state.hasParsed) {
      renderClassifiedData();
      saveState();
    }
  });
}

function copyFailedUrls() {
  var failed = collectFailedUrls();
  if (failed.length === 0) {
    showToast('没有失效链接', 'success');
    return;
  }
  var text = failed.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('已复制 ' + failed.length + ' 个失效链接', 'success');
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

/**
 * 隔离异常：把所有异常链接移入「异常站点」新分类
 */
function isolateFailedSites() {
  var data = state.classifiedData;
  var failedSites = [];

  // 收集所有异常链接
  for (var ci = 0; ci < data.length; ci++) {
    for (var si = data[ci].sites.length - 1; si >= 0; si--) {
      var site = data[ci].sites[si];
      var st = LinkChecker.getStatus(site.url);
      if (st !== 'ok') {
        failedSites.push(site);
        data[ci].sites.splice(si, 1);
      }
    }
    // 如果分类内所有链接都被移走了，删除该分类
    if (data[ci].sites.length === 0) {
      data.splice(ci, 1);
      ci--;
    }
  }

  if (failedSites.length === 0) {
    showToast('没有异常链接需要隔离', 'success');
    return;
  }

  // 创建「异常站点」分类
  var isolateCat = {
    categoryName: '异常站点',
    categoryIcon: '⚠️',
    categoryColor: '#EF4444',
    sites: failedSites
  };
  data.push(isolateCat);

  state.classifiedData = data;
  renderClassifiedData();
  saveState();
  showToast('已将 ' + failedSites.length + ' 个异常链接移入「异常站点」', 'success');
}

/**
 * 清理异常：删除所有异常链接
 */
function removeFailedSites() {
  var data = state.classifiedData;
  var removedCount = 0;

  for (var ci = 0; ci < data.length; ci++) {
    for (var si = data[ci].sites.length - 1; si >= 0; si--) {
      var site = data[ci].sites[si];
      var st = LinkChecker.getStatus(site.url);
      if (st !== 'ok') {
        data[ci].sites.splice(si, 1);
        removedCount++;
      }
    }
    if (data[ci].sites.length === 0) {
      data.splice(ci, 1);
      ci--;
    }
  }

  if (removedCount === 0) {
    showToast('没有异常链接需要清理', 'success');
    return;
  }

  state.classifiedData = data;
  renderClassifiedData();
  saveState();
  showToast('已清理 ' + removedCount + ' 个异常链接', 'success');
}

function handleCategoryAction(e) {
  var act = this.getAttribute('data-act');
  var catIndex = parseInt(this.getAttribute('data-index') || this.getAttribute('data-cat'));
  var siteIndex = parseInt(this.getAttribute('data-site'));

  if (act === 'editIcon') openIconPicker(catIndex);
  else if (act === 'editSiteIcon') openSiteIconPicker(catIndex, siteIndex);
  else if (act === 'editName') editCategoryName(catIndex);
  else if (act === 'editSiteName') editSiteName(catIndex, siteIndex);
  else if (act === 'siteAction') openActionPicker(catIndex, siteIndex);
  else if (act === 'moveCat') moveCategory(parseInt(this.getAttribute('data-index')), this.getAttribute('data-dir'));
}

// ===== 图标选择器 =====
function openIconPicker(index) {
  state.editingCategoryIndex = index;
  var html = '';
  ICON_OPTIONS.forEach(function(icon) {
    html += '<div class="icon-item" data-icon="' + icon + '"><span class="icon-emoji">' + icon + '</span></div>';
  });

  showModal({
    title: '🎨 选择图标',
    customClass: 'icon-picker-modal',
    bodyHtml: '<div class="icon-grid">' + html + '</div>',
    onClose: function() { state.editingCategoryIndex = -1; }
  });

  document.querySelectorAll('.icon-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var icon = this.getAttribute('data-icon');
      var idx = state.editingCategoryIndex;
      if (idx === -1) return;
      state.classifiedData[idx].categoryIcon = icon;
      state.editingCategoryIndex = -1;
      closeModal();
      renderClassifiedData();
      saveState();
    });
  });
}

// ===== 小网站图标选择器 =====
function openSiteIconPicker(catIndex, siteIndex) {
  var catData = state.classifiedData[catIndex];
  var siteData = catData.sites[siteIndex];
  var currentIcon = siteData.icon || catData.categoryIcon;

  var html = '';
  ICON_OPTIONS.forEach(function(icon) {
    html += '<div class="icon-item' + (icon === currentIcon ? ' icon-selected' : '') + '" data-icon="' + icon + '"><span class="icon-emoji">' + icon + '</span></div>';
  });

  showModal({
    title: '🎨 选择图标',
    customClass: 'icon-picker-modal',
    bodyHtml: '<div class="icon-grid">' + html + '</div>',
    onClose: function() { state.editingCategoryIndex = -1; }
  });

  // 选择图标
  document.querySelectorAll('.icon-item[data-icon]').forEach(function(item) {
    item.addEventListener('click', function() {
      var icon = this.getAttribute('data-icon');
      state.classifiedData[catIndex].sites[siteIndex].icon = icon;
      closeModal();
      renderClassifiedData();
      saveState();
    });
  });
}

// ===== 编辑分类名称（同名合并） =====
function editCategoryName(index) {
  var oldName = state.classifiedData[index].categoryName;
  showPrompt('修改分类名称', oldName, '输入新名称').then(function(newName) {
    if (!newName || newName === oldName) return;

    state.classifiedData[index].categoryName = newName;

    // 查找同名分类
    var mergeTarget = -1;
    for (var i = 0; i < state.classifiedData.length; i++) {
      if (i !== index && state.classifiedData[i].categoryName === newName) {
        mergeTarget = i;
        break;
      }
    }

    if (mergeTarget !== -1) {
      var sourceSites = state.classifiedData[index].sites;
      for (var j = 0; j < sourceSites.length; j++) {
        state.classifiedData[mergeTarget].sites.push(sourceSites[j]);
      }
      state.classifiedData.splice(index, 1);
      renderClassifiedData();
      saveState();
      showToast('已自动合并到「' + newName + '」');
    } else {
      renderClassifiedData();
      saveState();
    }
  });
}

// ===== 编辑网站名称 =====
function editSiteName(catIndex, siteIndex) {
  var oldName = state.classifiedData[catIndex].sites[siteIndex].name;
  showPrompt('修改网站名称', oldName, '输入网站显示名称').then(function(newName) {
    if (newName) {
      state.classifiedData[catIndex].sites[siteIndex].name = newName;
      renderClassifiedData();
      saveState();
    }
  });
}

// ===== 网站操作面板（移动/删除） =====
function openActionPicker(catIndex, siteIndex) {
  var data = state.classifiedData;
  var site = data[catIndex].sites[siteIndex];
  var catList = [];
  for (var i = 0; i < data.length; i++) {
    if (i !== catIndex) {
      catList.push({ name: data[i].categoryName, icon: data[i].categoryIcon });
    }
  }

  state.moveCatIndex = catIndex;
  state.moveSiteIndex = siteIndex;

  var html = '';
  catList.forEach(function(cat, idx) {
    html += '<div class="move-cat-item" data-index="' + idx + '">' +
      '<span class="move-cat-icon">' + cat.icon + '</span>' +
      '<span class="move-cat-name">移动到「' + escapeHtml(cat.name) + '」</span>' +
    '</div>';
  });
  // 删除选项
  html += '<div class="move-cat-item move-cat-delete" data-act="delete">' +
    '<span class="move-cat-icon" style="color: #EF4444;">🗑</span>' +
    '<span class="move-cat-name" style="color: #EF4444;">删除「' + escapeHtml(site.name) + '」</span>' +
  '</div>';

  showModal({
    title: '📂 站点操作',
    bodyHtml: html,
    onClose: function() { state.moveCatIndex = -1; state.moveSiteIndex = -1; }
  });

  // 移动选项
  document.querySelectorAll('.move-cat-item[data-index]').forEach(function(item) {
    item.addEventListener('click', function() {
      confirmMoveSite(parseInt(this.getAttribute('data-index')));
    });
  });
  // 删除选项
  var deleteBtn = document.querySelector('.move-cat-item[data-act="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function() {
      confirmDeleteSite();
    });
  }
}

function confirmDeleteSite() {
  var catIndex = state.moveCatIndex;
  var siteIndex = state.moveSiteIndex;
  var siteName = state.classifiedData[catIndex].sites[siteIndex].name;

  showConfirm('确认删除', '确定要删除「' + siteName + '」吗？', {
    confirmText: '删除',
    cancelText: '取消'
  }).then(function(confirmed) {
    if (!confirmed) return;
    var data = state.classifiedData;
    data[catIndex].sites.splice(siteIndex, 1);
    if (data[catIndex].sites.length === 0) {
      data.splice(catIndex, 1);
    }
    state.moveCatIndex = -1;
    state.moveSiteIndex = -1;
    closeModal();
    renderClassifiedData();
    saveState();
    showToast('已删除「' + siteName + '」', 'success');
  });
}

function confirmMoveSite(targetIndex) {
  var data = state.classifiedData;
  var catIndex = state.moveCatIndex;
  var siteIndex = state.moveSiteIndex;

  var realTargetIndex = -1, count = -1;
  for (var i = 0; i < data.length; i++) {
    if (i !== catIndex) {
      count++;
      if (count === targetIndex) { realTargetIndex = i; break; }
    }
  }
  if (realTargetIndex === -1) return;

  var targetName = data[realTargetIndex].categoryName;
  var movedSite = data[catIndex].sites.splice(siteIndex, 1)[0];
  data[realTargetIndex].sites.push(movedSite);

  if (data[catIndex].sites.length === 0) {
    data.splice(catIndex, 1);
  }

  state.moveCatIndex = -1;
  state.moveSiteIndex = -1;
  closeModal();
  renderClassifiedData();
  saveState();
  showToast('已移动到「' + targetName + '」', 'success');
}

// ===== 移动分类位置 =====
function moveCategory(index, direction) {
  var data = state.classifiedData;
  var targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= data.length) return;

  var temp = data[index];
  data[index] = data[targetIndex];
  data[targetIndex] = temp;
  renderClassifiedData();
  saveState();
}

// ===== 填入示例 =====
var SAMPLE_LINKS = [
  'https://chat.deepseek.com DeepSeek（AI 对话）',
  'https://kimi.moonshot.cn Kimi（AI 对话）',
  'https://chatgpt.com ChatGPT（AI 对话）',
  'https://claude.ai Claude（AI 对话）',
  'https://gemini.google.com Gemini（AI 对话）',
  'https://www.doubao.com 豆包（AI 对话）',
  'https://midjourney.com Midjourney（AI 创作）',
  'https://suno.com Suno（AI 创作）',
  'https://klingai.kuaishou.com 可灵AI（AI 创作）',
  'https://www.jianying.com 剪映（AI 创作）',
  'https://github.com GitHub（开发者工具）',
  'https://vercel.com Vercel（开发者工具）',
  'https://stackoverflow.com Stack Overflow（开发者工具）',
  'https://cursor.sh Cursor（开发者工具）',
  'https://www.cloudflare.com Cloudflare（开发者工具）',
  'https://www.baidu.com 百度',
  'https://www.google.com Google',
  'https://www.bing.com Bing',
  'https://www.bilibili.com 哔哩哔哩（视频平台）',
  'https://www.youtube.com YouTube（视频平台）',
  'https://www.douyin.com 抖音（视频平台）',
  'https://www.zhihu.com 知乎（社交社区）',
  'https://www.xiaohongshu.com 小红书（社交社区）',
  'https://weibo.com 微博（社交社区）',
  'https://www.taobao.com 淘宝（电商平台）',
  'https://www.jd.com 京东（电商平台）',
  'https://www.figma.com Figma（设计工具）',
  'https://mastergo.com MasterGo（设计工具）',
  'https://www.notion.so Notion（效率办公）',
  'https://www.feishu.cn 飞书（效率办公）',
  'https://pan.baidu.com 百度网盘（云存储）',
  'https://www.aliyundrive.com 阿里云盘（云存储）',
  'https://36kr.com 36氪（新闻阅读）',
  'https://sspai.com 少数派（新闻阅读）'
];

function fillSample() {
  $('linkInput').value = SAMPLE_LINKS.join('\n');
  $('formatTip').style.display = 'none';
  updateLinkCount();
  showToast('已填入 ' + SAMPLE_LINKS.length + ' 个示例链接');
  
  // 填充示例后自动预校验
  setTimeout(function() {
    var urls = SAMPLE_LINKS.map(function(line) {
      var m = line.match(/(https?:\/\/[^\s]+)/);
      return m ? m[1] : '';
    }).filter(Boolean);
    if (urls.length > 0) {
      startPreCheck(urls);
    }
  }, 500);
}

// ===== 实时更新链接计数（防抖） =====
var countTimer = null;
function updateLinkCount() {
  if (countTimer) clearTimeout(countTimer);
  countTimer = setTimeout(function() {
    var text = $('linkInput').value.trim();
    var count = text ? Classifier.extractUrls(text).length : 0;
    var el = $('linkCount');
    if (count > 0) {
      el.textContent = '检测到 ' + count + ' 个链接';
      el.style.color = 'var(--primary)';
    } else {
      el.textContent = '实时检测 URL…';
      el.style.color = 'var(--text-secondary)';
    }
    countTimer = null;
  }, 200);
}

// ===== 清空输入 =====
function onClearInput() {
  $('linkInput').value = '';
  $('formatTip').style.display = 'block';
  updateLinkCount();
  showToast('输入已清空，预览数据保留');
}

// ===== 解析链接（合并模式） =====
function onParse() {
  var text = $('linkInput').value.trim();
  if (!text) { showToast('请先粘贴链接'); return; }

  $('parseBtn').disabled = true;
  $('parseBtn').innerHTML = '⏳ 解析中…';
  $('parseBtn').style.opacity = '0.7';

  setTimeout(function() {
    var newSites = Classifier.parseLinks(text);
    if (newSites.length === 0) {
      showToast('未解析到有效链接', 'error');
      $('parseBtn').disabled = false;
      $('parseBtn').innerHTML = '解析链接';
      $('parseBtn').style.opacity = '1';
      return;
    }

    // 获取已有站点域名
    var existingDomains = {};
    if (state.hasParsed) {
      state.classifiedData.forEach(function(cat) {
        cat.sites.forEach(function(site) {
          var d = Classifier.extractDomain(site.url);
          existingDomains[d] = true;
        });
      });
    }

    // 过滤掉已存在的域名
    var mergedSites = [];
    if (state.hasParsed) {
      // 先把旧的加进来
      state.classifiedData.forEach(function(cat) {
        cat.sites.forEach(function(site) {
          mergedSites.push(site);
        });
      });
    }
    // 只添加新域名
    var addedCount = 0;
    newSites.forEach(function(site) {
      var d = Classifier.extractDomain(site.url);
      if (!existingDomains[d]) {
        mergedSites.push(site);
        addedCount++;
      }
    });

    if (addedCount === 0 && state.hasParsed) {
      showToast('所有链接都已存在，无新增');
      $('parseBtn').disabled = false;
      $('parseBtn').innerHTML = '解析链接';
      $('parseBtn').style.opacity = '1';
      return;
    }

    var grouped = Classifier.groupByCategory(mergedSites);
    state.parsedCount = mergedSites.length;
    state.classifiedData = grouped;

    // 先保存旧值再标记，避免消息判断错误
    var wasParsed = state.hasParsed;
    state.hasParsed = true;

    var msg = wasParsed && addedCount > 0
      ? '合并完成，新增 ' + addedCount + ' 个'
      : mergedSites.length + ' 个链接已解析';
    $('linkCount').textContent = msg;
    $('parseBtn').disabled = false;
    $('parseBtn').innerHTML = '解析链接';
    $('parseBtn').style.opacity = '1';

    renderClassifiedData();
    updatePreviewColors();
    saveState();
    showToast('解析成功', 'success');

    // 解析后自动预校验
    setTimeout(function() {
      var urls = [];
      state.classifiedData.forEach(function(cat) {
        cat.sites.forEach(function(site) {
          if (site.url) urls.push(site.url);
        });
      });
      if (urls.length > 0) {
        startPreCheck(urls);
      }
    }, 500);
  }, 150);
}

// ===== 导出 HTML =====
function onExport() {
  if (state.classifiedData.length === 0) { showToast('请先解析链接'); return; }
  _doExport();
}

function _doExport() {
  var siteTitle = $('siteTitle').value || '我的导航站';
  var siteSubtitle = $('siteSubtitle').value || '';
  // 获取当前主题的色调，替代硬编码 #4F6EF7
  var themeColor = getThemePrimaryColor(state.currentTheme);
  var singleFileHTML = generateSingleFile(siteTitle, siteSubtitle, themeColor, state.currentTheme);

  showExportSuccess(singleFileHTML);
}

function getThemePrimaryColor(themeId) {
  if (themeId === 'custom' && customThemeColor) return customThemeColor;
  var theme = THEMES.find(function(t) { return t.id === themeId; });
  return theme ? theme.color : '#4F6EF7';
}

function generateSingleFile(siteTitle, siteSubtitle, themeColor, themeId) {
  var escapedTitle = escapeHtml(siteTitle);
  var escapedSubtitle = escapeHtml(siteSubtitle);
  var year = new Date().getFullYear();

  var theme = THEMES.find(function(t) { return t.id === themeId; });
  if (!theme) {
    // 处理自定义主题
    theme = customThemeColor ? generateCustomTheme(customThemeColor) : THEMES[0];
  }
  var themeVars = Object.entries(theme.css).map(function(entry) {
    return '  ' + entry[0] + ': ' + entry[1] + ';';
  }).join('\n');

  var dataJs = HtmlGenerator.generateDataJs(state.classifiedData);
  var appJs = HtmlGenerator.generateAppJS();

  return '<!DOCTYPE html>\n' +
'<html lang="zh-CN">\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>' + escapedTitle + '</title>\n' +
'<meta name="description" content="' + escapeAttr(siteSubtitle || siteTitle + ' - 个人导航站') + '">\n' +
'<meta property="og:title" content="' + escapeAttr(siteTitle) + '">\n' +
'<meta property="og:description" content="' + escapeAttr(siteSubtitle || siteTitle + ' - 收录实用网站和工具') + '">\n' +
'<meta property="og:type" content="website">\n' +
'<meta name="robots" content="index, follow">\n' +
'<style>\n' +
'*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n' +
':root {\n' +
'  --primary: ' + themeColor + ';\n' +
'  --primary-light: ' + hexToRgba(themeColor, 0.08) + ';\n' +
'  --bg: #F5F6FA;\n' +
'  --card-bg: #FFFFFF;\n' +
'  --text: #2C3E50;\n' +
'  --text-secondary: #7F8C9B;\n' +
'  --text-light: #B0B8C5;\n' +
'  --border: #E8ECF1;\n' +
'  --shadow: 0 2px 12px rgba(0,0,0,0.06);\n' +
'  --shadow-hover: 0 6px 24px rgba(0,0,0,0.10);\n' +
'  --radius: 12px;\n' +
'  --radius-sm: 8px;\n' +
'  --transition: 0.2s ease;\n' +
'  --max-width: 1200px;\n' +
'}\n' +
':root {\n' + themeVars + '\n}\n' +
'html { scroll-behavior: smooth; }\n' +
'body {\n' +
'  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;\n' +
'  background: var(--bg);\n' +
'  color: var(--text);\n' +
'  line-height: 1.6;\n' +
'  min-height: 100dvh;\n' +
'}\n' +
'.header { background: var(--header-bg, linear-gradient(135deg, var(--primary) 0%, ' + hexToRgba(themeColor, 0.75) + ' 100%)); color: var(--header-text, #fff); padding: 24px 0 20px; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 16px ' + hexToRgba(themeColor, 0.25) + '; }\n' +
'.header-inner { max-width: var(--max-width); margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }\n' +
'.logo { display: flex; align-items: center; gap: 10px; }\n' +
'.logo-icon { font-size: 28px; }\n' +
'.logo h1 { font-size: 22px; font-weight: 700; letter-spacing: 1px; }\n' +
'.logo-sub { font-size: 13px; opacity: 0.85; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 20px; margin-left: 4px; }\n' +
'.search-bar { max-width: var(--max-width); margin: 24px auto 0; padding: 0 24px; }\n' +
'.search-inner { background: var(--card-bg); border-radius: var(--radius); padding: 0 20px; display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow); border: 2px solid transparent; transition: all var(--transition); }\n' +
'.search-inner:focus-within { border-color: var(--primary); box-shadow: var(--shadow-hover); }\n' +
'.search-icon { font-size: 18px; flex-shrink: 0; }\n' +
'.search-inner input { flex: 1; border: none; outline: none; height: 52px; font-size: 15px; color: var(--text); background: transparent; }\n' +
'.search-shortcut { font-size: 11px; color: var(--text-light); background: var(--bg); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); font-family: monospace; }\n' +
'.nav-container { max-width: var(--max-width); margin: 0 auto; padding: 24px; }\n' +
'.nav-section { margin-bottom: 32px; }\n' +
'.nav-section-title { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }\n' +
'.nav-section-title::after { content: ""; flex: 1; height: 1px; background: var(--border); margin-left: 8px; }\n' +
'.nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }\n' +
'.nav-card { background: var(--card-bg); border-radius: var(--radius); padding: 18px 20px; display: flex; align-items: center; gap: 14px; text-decoration: none; color: var(--text); box-shadow: var(--shadow); transition: all var(--transition); border: 1px solid transparent; cursor: pointer; }\n' +
'.nav-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); border-color: var(--primary-light); }\n' +
'.nav-card-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; overflow: hidden; position: relative; }\n' +
'.nav-favicon { width: 24px; height: 24px; border-radius: 4px; position: absolute; z-index: 1; }\n' +
'.nav-fallback { position: absolute; z-index: 0; font-size: 22px; }\n' +
'.nav-card-info { flex: 1; min-width: 0; }\n' +
'.nav-card-name { font-size: 15px; font-weight: 600; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n' +
'.nav-card-desc { font-size: 12px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n' +
'.nav-card-tag { font-size: 11px; background: var(--primary-light); color: var(--primary); padding: 2px 8px; border-radius: 4px; font-weight: 500; flex-shrink: 0; }\n' +
'.back-top { position: fixed; bottom: 32px; right: 32px; width: 44px; height: 44px; border-radius: 50%; background: var(--primary); color: #fff; border: none; font-size: 20px; box-shadow: 0 4px 12px ' + hexToRgba(themeColor, 0.3) + '; cursor: pointer; opacity: 0; transition: opacity 0.2s; z-index: 99; }\n' +
'.back-top.visible { opacity: 1; }\n' +
'.footer { text-align: center; padding: 40px 24px; color: var(--text-secondary); font-size: 14px; }\n' +
'.contact-btn { display: inline-block; margin-top: 12px; padding: 8px 20px; background: var(--primary); color: #fff; border: none; border-radius: 20px; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }\n' +
'.contact-btn:hover { opacity: 0.85; }\n' +
'.contact-info { margin-top: 12px; padding: 12px 16px; background: var(--primary-light); border-radius: 8px; font-size: 13px; color: var(--text); display: none; }\n' +
'.contact-info.show { display: block; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n\n' +
'<header class="header"><div class="header-inner"><div class="logo"><span class="logo-icon">⚡</span><h1>' + escapedTitle + '</h1>' + (siteSubtitle ? '<span class="logo-sub">' + escapedSubtitle + '</span>' : '') + '</div></div></header>\n\n' +
'<div class="search-bar"><div class="search-inner"><span class="search-icon">🔍</span><input type="text" id="searchInput" placeholder="搜索网址、工具..." autocomplete="off"><span class="search-shortcut">Ctrl+K</span></div></div>\n\n' +
'<div class="nav-container" id="navContainer"></div>\n\n' +
'<button class="back-top" id="backTop" title="返回顶部">⬆</button>\n\n' +
'<footer class="footer"><p>' + escapedTitle + ' &copy; ' + year + '</p><button class="contact-btn" onclick="document.getElementById(\'contactInfo\').classList.toggle(\'show\')">🌐 生成在线版</button><div id="contactInfo" class="contact-info">📞 微信：anyang0188 ｜ 帮你部署导航站到服务器，生成可分享的网页链接</div></footer>\n\n' +
'<script>\n' + dataJs + '\n</script>\n' +
'<script>\n' + appJs + '\n</script>\n' +
'</body>\n</html>';
}

function showExportSuccess(html) {
  showModal({
    title: '✅ 导航站已生成',
    bodyHtml:
      '<div class="feature-item"><span class="feature-icon">📋</span>' +
      '<span class="feature-text">点击"复制代码"，然后粘贴到记事本</span></div>' +
      '<div class="feature-item"><span class="feature-icon">💾</span>' +
      '<span class="feature-text">保存为 .html 文件，浏览器打开即可使用</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📖</span>' +
      '<span class="feature-text">点击"使用说明"查看详细教程</span></div>' +
      '<div class="modal-btn-group">' +
        '<button class="modal-btn modal-btn-secondary" id="successGuide">使用说明</button>' +
        '<button class="modal-btn modal-btn-primary" id="successDownload">下载文件</button>' +
        '<button class="modal-btn modal-btn-primary" id="successCopy">复制代码</button>' +
      '</div>'
  });

  $('successGuide').addEventListener('click', function() {
    closeModal();
    showGuide();
  });
  $('successDownload').addEventListener('click', function() {
    downloadHTML(html);
  });
  $('successCopy').addEventListener('click', function() {
    copyToClipboard(html);
  });
}

function downloadHTML(html) {
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var siteTitle = $('siteTitle').value || 'nav-site';
  a.download = siteTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_') + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('文件已下载', 'success');
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast('代码已复制', 'success');
      closeModal();
    }).catch(function() {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('代码已复制', 'success');
    closeModal();
  } catch (e) {
    showToast('复制失败，请手动下载文件');
    closeModal();
  }
  document.body.removeChild(ta);
}

// ===== 书签导入功能 =====

// 书签导入英文分组名 → 中文映射
var BOOKMARK_GROUP_MAP = {
  'Other Bookmarks': '其他书签',
  'Bookmarks Toolbar': '收藏夹栏',
  'Bookmarks Bar': '收藏夹栏',
  'Firefox Bookmarks': 'Firefox 书签',
  'Chrome Bookmarks': 'Chrome 书签',
  'Edge Favorites': 'Edge 收藏夹',
  'Internet Explorer Favorites': 'IE 收藏夹',
  'Recently Bookmarked': '最近收藏',
  'Unsorted Bookmarks': '未分类书签',
  'Mobile Bookmarks': '手机书签'
};

var BOOKMARK_BLACKLIST = ['已导入', 'imported', '系统文件夹'];

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/[<>\/\\|?*:"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\w\u4e00-\u9fa5\-]+/, '')
    .replace(/[^\w\u4e00-\u9fa5\-]+$/, '');
}

function importBookmarks(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var content = e.target.result;
    
    var parser = new DOMParser();
    var doc = parser.parseFromString(content, 'text/html');
    
    // 方案：遍历所有 <A> 标签，通过父级 H3 向上查找路径
    var allAnchors = doc.querySelectorAll('a');
    var allLinks = [];
    
    for (var ai = 0; ai < allAnchors.length; ai++) {
      var a = allAnchors[ai];
      var url = a.getAttribute('href') || a.getAttribute('HREF') || '';
      var title = cleanTitle(a.textContent || a.innerText || '');
      
      if (!url) continue;
      
      // 向上遍历找 H3 文件夹路径
      var pathParts = [];
      var current = a.parentElement; // 通常是 DT
      
      while (current) {
        // 找上一个兄弟 H3（文件夹标题）
        var prev = current.previousElementSibling;
        if (prev && prev.tagName === 'H3') {
          var folderName = cleanTitle(prev.textContent);
          if (folderName) {
            pathParts.unshift(folderName);
          }
        }
        // 往上走一层（DT -> DL -> DT -> DL ...）
        var parent = current.parentElement;
        if (parent && parent.tagName === 'DT') {
          // 继续往上找 DT 的兄弟 H3
          current = parent.parentElement;
        } else {
          current = parent;
        }
      }
      
      // 过滤黑名单文件夹
      var validPathParts = [];
      var fullyBlocked = false;
      for (var p = 0; p < pathParts.length; p++) {
        var isBl = false;
        for (var b = 0; b < BOOKMARK_BLACKLIST.length; b++) {
          if (pathParts[p].toLowerCase() === BOOKMARK_BLACKLIST[b].toLowerCase()) {
            isBl = true;
            break;
          }
        }
        if (isBl) {
          // 如果是"已导入"类完全匹配的黑名单文件夹，跳过整个文件夹
          var folderLower = pathParts[p].toLowerCase();
          for (var b = 0; b < BOOKMARK_BLACKLIST.length; b++) {
            if (folderLower === BOOKMARK_BLACKLIST[b].toLowerCase()) {
              fullyBlocked = true;
              break;
            }
          }
        } else {
          validPathParts.push(pathParts[p]);
        }
      }
      // 如果文件夹名完全匹配黑名单（如"已导入"），跳过整个文件夹
      if (fullyBlocked && validPathParts.length === 0) {
        continue;
      }
      
      if (!title) {
        try { title = new URL(url).hostname.replace('www.', ''); } catch(ex) { title = url; }
      }
      
      allLinks.push({
        url: url,
        title: title,
        path: validPathParts.map(function(p) { return BOOKMARK_GROUP_MAP[p] || p; }).join('-')
      });
    }
    
    // URL 去重（保持首次出现的顺序）
    var seenUrls = {};
    var uniqueLinks = [];
    for (var i = 0; i < allLinks.length; i++) {
      var u = allLinks[i].url;
      if (!seenUrls[u]) {
        seenUrls[u] = true;
        uniqueLinks.push(allLinks[i]);
      }
    }
    
    // 格式化输出：带路径分类的链接
    var lines = [];
    for (var j = 0; j < uniqueLinks.length; j++) {
      var link = uniqueLinks[j];
      var line = link.url;
      if (link.path) {
        line += ' ' + link.path + '/' + link.title;
      } else {
        line += ' ' + link.title;
      }
      lines.push(line);
    }
    
    var newText = lines.join('\n');
    
    // 追加到现有文本框（不覆盖已有内容）
    var textarea = $('linkInput');
    var existing = textarea.value.trim();
    if (existing) {
      textarea.value = existing + '\n\n--- 以下为书签导入 ---\n' + newText;
    } else {
      textarea.value = newText;
    }
    
    // 更新计数
    updateLinkCount();
    
    // 先保存值再清除临�?�数据
    var linkCount = uniqueLinks.length;
    var preCheckUrls = uniqueLinks.map(function(l) { return l.url; });
    allLinks = null;
    uniqueLinks = null;
    seenUrls = null;
    content = null;
    doc = null;
    
    showToast('导入成功，共 ' + linkCount + ' 个链接');
    
    // 导入后自动预校验
    setTimeout(function() {
      if (preCheckUrls.length > 0) {
        startPreCheck(preCheckUrls);
      }
    }, 500);
  };
  
  reader.readAsText(file, 'UTF-8');
}

// ===== 重置 =====
function onReset() {
  showConfirm('确认重置', '重置后所有数据将被清空，确定吗？').then(function(confirmed) {
    if (confirmed) {
      $('linkInput').value = '';
      $('siteTitle').value = '我的导航站';
      $('siteSubtitle').value = '';
      state.siteTitle = '我的导航站';
      state.siteSubtitle = '';
      $('linkCount').textContent = '实时检测 URL…';
      $('linkCount').style.color = 'var(--text-secondary)';
      $('formatTip').style.display = 'block';
      $('parseBtn').disabled = false;
      $('parseBtn').innerHTML = '解析链接';
      $('parseBtn').style.opacity = '1';
      state.parsedCount = 0;
      state.classifiedData = [];
      state.hasParsed = false;
      renderClassifiedData();
      clearPersistedState();
      showToast('已重置');
    }
  });
}

// ===== 使用说明 =====
function showGuide() {
  showModal({
    title: '📖 使用说明',
    bodyHtml:
      '<div class="deploy-banner">' +
        '<div class="deploy-title"><span class="deploy-icon">🌐</span> 代部署服务</div>' +
        '<div class="deploy-divider"></div>' +
        '<div class="deploy-item"><span class="deploy-item-icon">🛠️</span><span>不想折腾部署流程？帮你直接上线，生成永久公开分享链接 · 费用 <strong>5 元起</strong></span></div>' +
        '<div class="deploy-item"><span class="deploy-item-icon">📞</span><span>联系微信：<strong>anyang0188</strong>（备注：导航部署）</span></div>' +
      '</div>' +

      '<div class="section-title">✨ 主要功能</div>' +
      '<div class="feature-item"><span class="feature-icon">🔗</span><span class="feature-text">粘贴链接，自动解析网址和站点名称</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📂</span><span class="feature-text">智能识别分类，自动归类AI工具、搜索引擎、资源网站</span></div>' +
      '<div class="feature-item"><span class="feature-icon">🎨</span><span class="feature-text">3套背景主题 + 自定义取色器</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📄</span><span class="feature-text">一键导出完整静态HTML导航文件，永久离线可用</span></div>' +

      '<div class="section-title">📝 输入格式（三选一，一行一条）</div>' +
      '<div class="format-example"><span class="format-label">格式1（最简）：只粘贴网址</span><span class="format-code">https://github.com</span></div>' +
      '<div class="format-example"><span class="format-label">格式2（自定义名称）：网址 + 显示名称</span><span class="format-code">https://chatgpt.com ChatGPT</span></div>' +
      '<div class="format-example"><span class="format-label">格式3（指定分类，批量整理神器）：网址 + 名称 +（分类名）</span><span class="format-code">https://chatgpt.com ChatGPT（AI对话）</span></div>' +
      '<div class="format-note">💡 用括号包裹分类名，程序自动新建分组</div>' +

      '<div class="section-title">📥 批量导入浏览器全部收藏夹</div>' +
      '<div class="format-intro">适合一次性迁移几百条书签，不用一条条复制：</div>' +
      '<div class="guide-step"><span class="step-num">1️⃣</span><span class="step-text">电脑打开 Chrome/Edge，地址栏输入 chrome://bookmarks 或 edge://favorites/</span></div>' +
      '<div class="guide-step"><span class="step-num">2️⃣</span><span class="step-text">右上角「⋮」菜单 → 导出书签，保存为HTML文件（所有浏览器通用标准格式）</span></div>' +
      '<div class="guide-step"><span class="step-num">3️⃣</span><span class="step-text">点击本站「📥 一键导入书签」按钮，上传导出的HTML文件，自动读取文件夹结构，一键生成分类+链接</span></div>' +
      '<div class="format-note">⚠️ 受浏览器沙箱安全限制，普通网页无法直接读取浏览器内部书签数据库。本工具采用本地文件解析方案，上传的HTML文件仅在浏览器内存运算，不会上传任何数据至服务器，解析完毕内存数据自动清空，隐私安全性高于需要申请书签权限的网页脚本和浏览器扩展。</div>' +

      '<div class="section-title">✏️ 分类 & 站点编辑</div>' +
      '<div class="feature-item"><span class="feature-icon">🎯</span><span class="feature-text">点击分类图标 → 更换图标（42个可选）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">✏️</span><span class="feature-text">点击分类名称 → 修改名字，同名分类会自动合并</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📝</span><span class="feature-text">点击网站名称 → 修改前端展示文字（仅导出生效）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">⇅</span><span class="feature-text">点击 ⇅ 按钮 → 弹出操作面板，可选择移动到其它分类或删除站点</span></div>' +
      '<div class="feature-item"><span class="feature-icon">↑↓</span><span class="feature-text">点击 ↑↓ 按钮 → 调整分类/网站排序</span></div>' +
      '<div class="note-item"><span class="note-icon">🗑</span><span class="note-text">分类内所有网站清空后，分类会自动消失</span></div>' +

      '<div class="section-title">🚀 上线部署</div>' +
      '<div class="guide-step"><span class="step-num">1️⃣</span><span class="step-text">配置好所有链接、选好喜欢的背景主题</span></div>' +
      '<div class="guide-step"><span class="step-num">2️⃣</span><span class="step-text">点击「📥 生成链页」导出完整HTML源码</span></div>' +
      '<div class="guide-step"><span class="step-num">3️⃣</span><span class="step-text">自行上传GitHub Pages、Vercel、服务器即可生成永久可分享网页链接</span></div>' +

      '<div class="section-title">⚠️ 注意事项</div>' +
      '<div class="note-item"><span class="note-icon">📱</span><span class="note-text">导出文件为纯静态HTML，无后端、无数据库，任何浏览器都能打开</span></div>' +
      '<div class="note-item"><span class="note-icon">🔒</span><span class="note-text">所有数据全部保存在本地文件，隐私完全可控，不会上传任何服务器</span></div>'
  });
}

// ===== 通用弹窗 =====
var currentModal = null;

function showModal(opts) {
  closeModal();
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  var cls = opts.customClass ? ' ' + opts.customClass : '';
  overlay.innerHTML =
    '<div class="modal-content' + cls + '">' +
      '<div class="modal-header">' +
        '<span class="modal-title">' + escapeHtml(opts.title) + '</span>' +
        '<span class="modal-close">✕</span>' +
      '</div>' +
      '<div class="modal-body">' + (opts.bodyHtml || '') + '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  currentModal = overlay;

  overlay.querySelector('.modal-close').addEventListener('click', function() {
    closeModal();
    if (opts.onClose) opts.onClose();
  });
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) {
      closeModal();
      if (opts.onClose) opts.onClose();
    }
  });
}

function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
  }
}

// ===== 事件绑定 =====
function bindEvents() {
  // 链接输入 - 实时计数
  $('linkInput').addEventListener('input', function() {
    $('formatTip').style.display = this.value ? 'none' : 'block';
    updateLinkCount();
  });

  // 填入示例
  $('sampleBtn').addEventListener('click', fillSample);

  // 清空输入（保留预览）
  $('clearBtn').addEventListener('click', onClearInput);

  // 解析按钮
  $('parseBtn').addEventListener('click', onParse);

  // Ctrl+Enter 快捷解析
  $('linkInput').addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onParse();
    }
  });

  // 导出按钮
  $('exportBtn').addEventListener('click', onExport);

  // 重置按钮
  $('resetBtn').addEventListener('click', onReset);

  // 使用说明
  $('guideBtn').addEventListener('click', showGuide);

  // 书签导入
  $('bookmarkImportBtn').addEventListener('click', function() {
    $('bookmarkFileInput').click();
  });
  $('bookmarkFileInput').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.html?$/i)) {
      showToast('请选择 .html 格式的书签文件', 'error');
      this.value = '';
      return;
    }
    importBookmarks(file);
    this.value = ''; // 重置，允许重复选择同一文件
  });

  // 名称/副标题输入变化时同步 state
  $('siteTitle').addEventListener('input', function() {
    state.siteTitle = this.value;
    saveState();
  });
  $('siteSubtitle').addEventListener('input', function() {
    state.siteSubtitle = this.value;
    saveState();
  });
}

// ===== 初始化 =====
function init() {
  // 尝试恢复持久化数据
  var restored = loadState();
  if (restored) {
    $('siteTitle').value = state.siteTitle;
    $('siteSubtitle').value = state.siteSubtitle;
    $('linkCount').textContent = state.parsedCount + ' 个链接已解析';
  }
  renderThemes();
  bindEvents();
  // 始终应用初始主题 CSS
  var theme = THEMES.find(function(t) { return t.id === state.currentTheme; });
  if (theme) {
    applyThemeCSS(theme.css);
  } else if (customThemeColor) {
    var ct = generateCustomTheme(customThemeColor);
    applyThemeCSS(ct.css);
  }
  updatePreviewColors();
  if (restored) {
    renderClassifiedData();
    // 页面恢复时，加载缓存
    LinkChecker.checkUrls([], function() {}, function() {
      // 缓存加载完成，重新渲染显示状态圆点
      renderClassifiedData();
    });
    // 如果缓存中没有当前页面的URL，自动触发预校验
    var currentUrls = getAllUrls();
    var stats = LinkChecker.getStats(currentUrls);
    if (stats.total === 0 && currentUrls.length > 0) {
      startPreCheck(currentUrls);
    }
  }

  // 取色器改用动态DOM渲染，无需初始化绑定
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


// ===== 自定义取色器（动态DOM渲染，杜绝残留） =====

// 页面初始化时强制清理残留弹窗
(function cleanupOldPicker() {
  var old = document.getElementById('colorPickerOverlay');
  if (old) old.remove();
})();

function openColorPicker() {
  // 如果已有自定义颜色，解析 HSL
  if (customThemeColor) {
    var hsl = hexToHsl(customThemeColor);
    if (hsl) {
      colorPickerState.hue = hsl.h;
      colorPickerState.saturation = hsl.s;
      colorPickerState.lightness = hsl.l;
    }
  }
  // 动态创建弹窗DOM
  createColorPickerDOM();
}

function createColorPickerDOM() {
  // 先清理可能残留的弹窗
  destroyColorPicker();

  var h = colorPickerState.hue;
  var s = colorPickerState.saturation;
  var l = colorPickerState.lightness;
  var hex = hslToHex(h, s, l);
  var hueY = Math.round((1 - h / 360) * MAX_Y);
  var satY = Math.round((1 - s / 100) * MAX_Y);
  var lightY = Math.round((1 - l / 100) * MAX_Y);

  // 创建遮罩层
  var overlay = document.createElement('div');
  overlay.id = 'colorPickerOverlay';
  overlay.className = 'color-picker-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;';

  // 创建弹窗
  var modal = document.createElement('div');
  modal.className = 'color-picker-modal';
  modal.style.cssText = 'background:#fff;border-radius:14px;box-shadow:0 16px 48px rgba(0,0,0,0.2);width:320px;max-width:90vw;';

  // 弹窗内容
  modal.innerHTML = 
    '<div class="color-picker-header" style="padding:16px 20px 12px;border-bottom:1px solid #E5E7EB;">' +
      '<span class="color-picker-title" style="font-size:16px;font-weight:600;color:#1A1A2E;">🎨 自定义颜色</span>' +
    '</div>' +
    '<div class="color-picker-body" style="padding:20px;">' +
      '<div class="vgroup" style="display:flex;gap:24px;align-items:flex-start;justify-content:center;">' +
        '<div class="vcol" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<span class="vlabel" style="font-size:12px;color:#7F8C9B;font-weight:500;">色相</span>' +
          '<div class="vtrack vtrack-hue" id="hueTrack" style="width:48px;height:200px;border-radius:24px;position:relative;border:2px solid #E5E7EB;cursor:pointer;touch-action:none;background:linear-gradient(to top,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%);">' +
            '<div class="vthumb" id="hueThumb" style="position:absolute;left:50%;transform:translate(-50%,-50%);width:48px;height:24px;pointer-events:none;top:' + (THUMB_HEIGHT/2+hueY) + 'px;"></div>' +
          '</div>' +
          '<span class="vval" id="hueVal" style="font-size:12px;color:#2C3E50;font-weight:600;">' + h + '°</span>' +
        '</div>' +
        '<div class="vcol" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<span class="vlabel" style="font-size:12px;color:#7F8C9B;font-weight:500;">饱和度</span>' +
          '<div class="vtrack vtrack-sat" id="satTrack" style="width:48px;height:200px;border-radius:24px;position:relative;border:2px solid #E5E7EB;cursor:pointer;touch-action:none;background:linear-gradient(to top,#808080 0%,' + hslToHex(h,100,50) + ' 100%);">' +
            '<div class="vthumb" id="satThumb" style="position:absolute;left:50%;transform:translate(-50%,-50%);width:48px;height:24px;pointer-events:none;top:' + (THUMB_HEIGHT/2+satY) + 'px;"></div>' +
          '</div>' +
          '<span class="vval" id="satVal" style="font-size:12px;color:#2C3E50;font-weight:600;">' + s + '%</span>' +
        '</div>' +
        '<div class="vcol" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;">' +
          '<span class="vlabel" style="font-size:12px;color:#7F8C9B;font-weight:500;">亮度</span>' +
          '<div class="vtrack vtrack-light" id="lightTrack" style="width:48px;height:200px;border-radius:24px;position:relative;border:2px solid #E5E7EB;cursor:pointer;touch-action:none;background:linear-gradient(to top,#000 0%,' + hslToHex(h,s,50) + ' 50%,#fff 100%);">' +
            '<div class="vthumb" id="lightThumb" style="position:absolute;left:50%;transform:translate(-50%,-50%);width:48px;height:24px;pointer-events:none;top:' + (THUMB_HEIGHT/2+lightY) + 'px;"></div>' +
          '</div>' +
          '<span class="vval" id="lightVal" style="font-size:12px;color:#2C3E50;font-weight:600;">' + l + '%</span>' +
        '</div>' +
      '</div>' +
      '<div class="color-picker-footer" style="display:flex;align-items:center;gap:12px;margin-top:20px;">' +
        '<div class="color-preview" id="colorPreview" style="width:44px;height:44px;border-radius:10px;background:' + hex + ';border:2px solid #E5E7EB;flex-shrink:0;"></div>' +
        '<div style="flex:1;"></div>' +
        '<button type="button" id="colorCancelBtn" style="font-size:14px;padding:8px 20px;border-radius:8px;border:none;cursor:pointer;background:#E8ECF1;color:#7F8C9B;transition:background 0.2s;">取消</button>' +
        '<button type="button" id="colorConfirmBtn" style="font-size:14px;padding:8px 20px;border-radius:8px;border:none;cursor:pointer;background:#4F6EF7;color:#fff;transition:background 0.2s;">确定</button>' +
      '</div>' +
    '</div>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // 绑定事件：点击遮罩外部关闭
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) destroyColorPicker();
  });

  // 绑定事件：取消按钮
  document.getElementById('colorCancelBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    destroyColorPicker();
  });

  // 绑定事件：确定按钮
  document.getElementById('colorConfirmBtn').addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    var hex = hslToHex(colorPickerState.hue, colorPickerState.saturation, colorPickerState.lightness);
    customThemeColor = hex;
    try { localStorage.setItem('jizhan_theme_color', customThemeColor); } catch(ex) {}
    var theme = generateCustomTheme(customThemeColor);
    state.currentTheme = 'custom';
    state.themeStyle = theme.preview;
    applyThemeCSS(theme.css);
    destroyColorPicker();
    renderThemes();
    updatePreviewColors();
    saveState();
  });

  // 初始化滑块拖拽
  initPickerDrag('hueTrack', 'hue');
  initPickerDrag('satTrack', 'saturation');
  initPickerDrag('lightTrack', 'lightness');
}

function destroyColorPicker() {
  var overlay = document.getElementById('colorPickerOverlay');
  if (overlay) {
    overlay.remove();
  }
}

function initPickerDrag(trackId, param) {
  var track = document.getElementById(trackId);
  if (!track) return;
  var dragging = false;

  function updateFromY(y) {
    var rect = track.getBoundingClientRect();
    var relY = y - rect.top - THUMB_HEIGHT / 2;
    var ratio = 1 - Math.max(0, Math.min(1, relY / MAX_Y));
    if (param === 'hue') {
      colorPickerState.hue = Math.round(ratio * 360);
    } else {
      colorPickerState[param] = Math.round(ratio * 100);
    }
    updatePickerUI();
  }

  function onMouseDown(e) {
    dragging = true;
    updateFromY(e.clientY);
    e.preventDefault();
  }

  function onTouchStart(e) {
    dragging = true;
    updateFromY(e.touches[0].clientY);
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (dragging) updateFromY(e.clientY);
  }

  function onTouchMove(e) {
    if (dragging) {
      updateFromY(e.touches[0].clientY);
      e.preventDefault();
    }
  }

  function onEnd() { dragging = false; }

  track.addEventListener('mousedown', onMouseDown);
  track.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('mouseup', onEnd);
  document.addEventListener('touchend', onEnd);
}

function updatePickerUI() {
  var h = colorPickerState.hue;
  var s = colorPickerState.saturation;
  var l = colorPickerState.lightness;
  var hex = hslToHex(h, s, l);

  var hueThumb = document.getElementById('hueThumb');
  var satThumb = document.getElementById('satThumb');
  var lightThumb = document.getElementById('lightThumb');
  var satTrack = document.getElementById('satTrack');
  var lightTrack = document.getElementById('lightTrack');
  var hueVal = document.getElementById('hueVal');
  var satVal = document.getElementById('satVal');
  var lightVal = document.getElementById('lightVal');
  var colorPreview = document.getElementById('colorPreview');

  if (!hueThumb) return; // 弹窗已关闭

  var hueY = Math.round((1 - h / 360) * MAX_Y);
  var satY = Math.round((1 - s / 100) * MAX_Y);
  var lightY = Math.round((1 - l / 100) * MAX_Y);

  hueThumb.style.top = (THUMB_HEIGHT / 2 + hueY) + 'px';
  satThumb.style.top = (THUMB_HEIGHT / 2 + satY) + 'px';
  lightThumb.style.top = (THUMB_HEIGHT / 2 + lightY) + 'px';

  if (satTrack) satTrack.style.background = 'linear-gradient(to top, #808080 0%, ' + hslToHex(h, 100, 50) + ' 100%)';
  if (lightTrack) lightTrack.style.background = 'linear-gradient(to top, #000 0%, ' + hslToHex(h, s, 50) + ' 50%, #fff 100%)';

  if (hueVal) hueVal.textContent = h + '°';
  if (satVal) satVal.textContent = s + '%';
  if (lightVal) lightVal.textContent = l + '%';
  if (colorPreview) colorPreview.style.background = hex;
}

})();
