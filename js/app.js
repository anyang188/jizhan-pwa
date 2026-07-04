/**
 * 集站 PWA 主逻辑
 * 从微信小程序迁移，wx.xxx → Web API
 */

(function() {
'use strict';

// ===== 常量 =====
var ICON_OPTIONS = ['🤖','🎨','📊','💻','🔍','📺','💬','🛒','🖌️','☁️','📰','📁',
  '⭐','🔥','🎯','⚡','🎮','🎵','📷','🌐','✉️','📱','🔧','💡','📚','💰','🏠','🗺️','📝','🎬','🎧','🏆','🥇','🛡️','🧰','🗂️','📌','🎈','🧩','🪄','🎪'];

var THEMES = [
  { id: 'clean', name: '纯净白', icon: '⬜',
    css: { '--bg': '#F5F6FA', '--card-bg': '#FFFFFF', '--text': '#2C3E50',
      '--text-secondary': '#7F8C9B', '--border': '#E8ECF1', '--shadow': '0 2px 12px rgba(0,0,0,0.06)',
      '--header-bg': 'linear-gradient(135deg, var(--primary) 0%, #6C8CFF 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#F5F6FA', cardBg: '#FFFFFF', text: '#2C3E50' } },
  { id: 'dark', name: '极夜黑', icon: '🌙',
    css: { '--bg': '#0f0f23', '--card-bg': '#1a1a35', '--text': '#e0e0f0',
      '--text-secondary': '#9090b0', '--border': '#2a2a50', '--shadow': '0 2px 12px rgba(0,0,0,0.3)',
      '--header-bg': 'linear-gradient(135deg, #0f0f23 0%, #1a1a35 100%)', '--header-text': '#e0e0f0' },
    preview: { bg: '#0f0f23', cardBg: '#1a1a35', text: '#e0e0f0' } },
  { id: 'ocean', name: '海洋蓝', icon: '🌊',
    css: { '--bg': '#e8f4fd', '--card-bg': '#ffffff', '--text': '#1a365d',
      '--text-secondary': '#4a6fa5', '--border': '#bee3f8', '--shadow': '0 2px 12px rgba(26,54,93,0.08)',
      '--header-bg': 'linear-gradient(135deg, #2b6cb0 0%, #63b3ed 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#e8f4fd', cardBg: '#ffffff', text: '#1a365d' } },
  { id: 'sunset', name: '落日橙', icon: '🌅',
    css: { '--bg': '#fff5f0', '--card-bg': '#ffffff', '--text': '#5d3a1a',
      '--text-secondary': '#b87c4a', '--border': '#ffe0cc', '--shadow': '0 2px 12px rgba(93,58,26,0.08)',
      '--header-bg': 'linear-gradient(135deg, #dd6b20 0%, #f6ad55 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#fff5f0', cardBg: '#ffffff', text: '#5d3a1a' } },
  { id: 'forest', name: '森林绿', icon: '🌿',
    css: { '--bg': '#f0f7f0', '--card-bg': '#ffffff', '--text': '#1a3d2e',
      '--text-secondary': '#4a7a5e', '--border': '#d4e8d4', '--shadow': '0 2px 12px rgba(26,61,46,0.08)',
      '--header-bg': 'linear-gradient(135deg, #276749 0%, #68d391 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#f0f7f0', cardBg: '#ffffff', text: '#1a3d2e' } },
  { id: 'aurora', name: '极光紫', icon: '🌌',
    css: { '--bg': '#f5f0ff', '--card-bg': '#ffffff', '--text': '#2d1a5d',
      '--text-secondary': '#7a4ab8', '--border': '#e0ccff', '--shadow': '0 2px 12px rgba(45,26,93,0.08)',
      '--header-bg': 'linear-gradient(135deg, #6b46c1 0%, #b794f4 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#f5f0ff', cardBg: '#ffffff', text: '#2d1a5d' } }
];

// ===== 状态 =====
var state = {
  linkText: '',
  siteTitle: '我的导航站',
  siteSubtitle: '',
  parsedCount: 0,
  classifiedData: [],
  hasParsed: false,
  currentTheme: 'clean',
  themeStyle: { bg: '#F5F6FA', cardBg: '#FFFFFF', text: '#2C3E50' },
  editingCategoryIndex: -1,
  moveCatIndex: -1,
  moveSiteIndex: -1
};

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

// ===== 主题渲染 =====
function renderThemes() {
  var html = '';
  THEMES.forEach(function(t) {
    html += '<div class="theme-item ' + (state.currentTheme === t.id ? 'theme-active' : '') + '" data-theme="' + t.id + '">' +
      '<div class="theme-color" style="background:' + t.preview.bg + ';">' +
        '<span class="theme-icon">' + t.icon + '</span>' +
      '</div>' +
      '<span class="theme-name">' + t.name + '</span>' +
    '</div>';
  });
  var picker = $('themePicker');
  picker.innerHTML = html;
  picker.querySelectorAll('.theme-item').forEach(function(item) {
    item.addEventListener('click', function() {
      var themeId = this.getAttribute('data-theme');
      var theme = THEMES.find(function(t) { return t.id === themeId; }) || THEMES[0];
      state.currentTheme = themeId;
      state.themeStyle = theme.preview;
      renderThemes();
      updatePreviewColors();
    });
  });
}

function updatePreviewColors() {
  var card = $('previewCard');
  if (card.style.display !== 'none') {
    card.style.background = state.themeStyle.cardBg;
    $('previewTitle').style.color = state.themeStyle.text;
  }
  $('container').style.background = state.themeStyle.bg;
}

// ===== 分类预览渲染 =====
function renderClassifiedData() {
  var data = state.classifiedData;
  if (data.length === 0) {
    $('previewCard').style.display = 'none';
    $('emptyState').style.display = state.hasParsed ? 'none' : 'block';
    $('bottomActions').style.display = 'none';
    return;
  }

  $('previewCard').style.display = 'block';
  $('emptyState').style.display = 'none';
  $('bottomActions').style.display = 'flex';
  $('previewHint').textContent = data.length + ' 个分类';
  $('previewCard').style.background = state.themeStyle.cardBg;
  $('previewTitle').style.color = state.themeStyle.text;

  var html = '';
  data.forEach(function(cat, catIndex) {
    html += '<div class="category-item">';
    html += '<div class="cat-header">';
    html += '<span class="cat-icon editable" data-act="editIcon" data-index="' + catIndex + '">' + cat.categoryIcon + '</span>';
    html += '<span class="cat-name editable" style="color:' + state.themeStyle.text + ';" data-act="editName" data-index="' + catIndex + '">' + escapeHtml(cat.categoryName) + '</span>';
    html += '<span class="cat-count">' + cat.sites.length + ' 个</span>';
    html += '<div class="cat-actions">';
    if (catIndex > 0) html += '<span class="move-btn" data-act="moveCat" data-index="' + catIndex + '" data-dir="up">↑</span>';
    if (catIndex < data.length - 1) html += '<span class="move-btn" data-act="moveCat" data-index="' + catIndex + '" data-dir="down">↓</span>';
    html += '</div></div>';
    html += '<div class="cat-sites">';
    cat.sites.forEach(function(site, siteIndex) {
      html += '<div class="cat-site">';
      html += '<span class="site-icon">' + site.icon + '</span>';
      html += '<span class="site-name editable" data-act="editSiteName" data-cat="' + catIndex + '" data-site="' + siteIndex + '">' + escapeHtml(site.name) + '</span>';
      html += '<span class="site-move" data-act="moveSite" data-cat="' + catIndex + '" data-site="' + siteIndex + '">⇅</span>';
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

function handleCategoryAction(e) {
  var act = this.getAttribute('data-act');
  var catIndex = parseInt(this.getAttribute('data-index') || this.getAttribute('data-cat'));
  var siteIndex = parseInt(this.getAttribute('data-site'));

  if (act === 'editIcon') openIconPicker(catIndex);
  else if (act === 'editName') editCategoryName(catIndex);
  else if (act === 'editSiteName') editSiteName(catIndex, siteIndex);
  else if (act === 'moveSite') openMovePicker(catIndex, siteIndex);
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
      showToast('已自动合并到「' + newName + '」');
    } else {
      renderClassifiedData();
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
    }
  });
}

// ===== 移动网站 =====
function openMovePicker(catIndex, siteIndex) {
  var data = state.classifiedData;
  var catList = [];
  for (var i = 0; i < data.length; i++) {
    if (i !== catIndex) {
      catList.push({ name: data[i].categoryName, icon: data[i].categoryIcon });
    }
  }
  if (catList.length === 0) { showToast('没有其他分类可移动'); return; }

  state.moveCatIndex = catIndex;
  state.moveSiteIndex = siteIndex;

  var html = '';
  catList.forEach(function(cat, idx) {
    html += '<div class="move-cat-item" data-index="' + idx + '">' +
      '<span class="move-cat-icon">' + cat.icon + '</span>' +
      '<span class="move-cat-name">' + escapeHtml(cat.name) + '</span>' +
    '</div>';
  });

  showModal({
    title: '📂 移动到分类',
    bodyHtml: html,
    onClose: function() { state.moveCatIndex = -1; state.moveSiteIndex = -1; }
  });

  document.querySelectorAll('.move-cat-item').forEach(function(item) {
    item.addEventListener('click', function() {
      confirmMoveSite(parseInt(this.getAttribute('data-index')));
    });
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
}

// ===== 解析链接 =====
function onParse() {
  var text = $('linkInput').value.trim();
  if (!text) { showToast('请先粘贴链接'); return; }

  var sites = Classifier.parseLinks(text);
  if (sites.length === 0) { showToast('未解析到有效链接'); return; }

  var grouped = Classifier.groupByCategory(sites);
  state.parsedCount = sites.length;
  state.classifiedData = grouped;
  state.hasParsed = true;

  $('linkCount').textContent = sites.length + ' 个链接已解析';
  renderClassifiedData();
  updatePreviewColors();
  showToast('解析成功', 'success');
}

// ===== 导出 HTML =====
function onExport() {
  if (state.classifiedData.length === 0) { showToast('请先解析链接'); return; }

  var totalSites = state.classifiedData.reduce(function(sum, cat) {
    return sum + (cat.sites ? cat.sites.length : 0);
  }, 0);

  if (totalSites > 50) {
    showExportWarn();
  } else {
    _doExport();
  }
}

function showExportWarn() {
  showModal({
    title: '⚠️ 导出提示',
    bodyHtml:
      '<div class="feature-item"><span class="feature-icon">📊</span>' +
      '<span class="feature-text">当前网站数量较多，导出文件可能较大。</span></div>' +
      '<div class="feature-item"><span class="feature-icon">💡</span>' +
      '<span class="feature-text">建议分批次操作，每次导出少量网站。</span></div>' +
      '<div class="modal-btn-group">' +
        '<button class="modal-btn modal-btn-secondary" id="warnCancel">取消</button>' +
        '<button class="modal-btn modal-btn-primary" id="warnConfirm">继续导出</button>' +
      '</div>'
  });
  $('warnCancel').addEventListener('click', closeModal);
  $('warnConfirm').addEventListener('click', function() { closeModal(); _doExport(); });
}

function _doExport() {
  var siteTitle = $('siteTitle').value || '我的导航站';
  var siteSubtitle = $('siteSubtitle').value || '';
  var singleFileHTML = generateSingleFile(siteTitle, siteSubtitle, '#4F6EF7', state.currentTheme);

  showExportSuccess(singleFileHTML);
}

function generateSingleFile(siteTitle, siteSubtitle, themeColor, themeId) {
  var escapedTitle = escapeHtml(siteTitle);
  var escapedSubtitle = escapeHtml(siteSubtitle);
  var year = new Date().getFullYear();

  var theme = THEMES.find(function(t) { return t.id === themeId; }) || THEMES[0];
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
'  min-height: 100vh;\n' +
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
'.nav-card-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }\n' +
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
  }
  document.body.removeChild(ta);
}

// ===== 重置 =====
function onReset() {
  showConfirm('确认重置', '重置后所有数据将被清空，确定吗？').then(function(confirmed) {
    if (confirmed) {
      $('linkInput').value = '';
      $('siteTitle').value = '我的导航站';
      $('siteSubtitle').value = '';
      $('linkCount').textContent = '0 个链接已解析';
      $('formatTip').style.display = 'block';
      state.linkText = '';
      state.parsedCount = 0;
      state.classifiedData = [];
      state.hasParsed = false;
      renderClassifiedData();
      showToast('已重置');
    }
  });
}

// ===== 使用说明 =====
function showGuide() {
  showModal({
    title: '📖 使用说明',
    bodyHtml:
      '<div class="section-title">✨ 主要功能</div>' +
      '<div class="feature-item"><span class="feature-icon">🔗</span><span class="feature-text">粘贴链接，自动解析网址和中文名</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📂</span><span class="feature-text">智能分类：AI 工具、搜索引擎、社交平台等</span></div>' +
      '<div class="feature-item"><span class="feature-icon">🎨</span><span class="feature-text">一键生成精美导航站 HTML 文件</span></div>' +

      '<div class="section-title">✏️ 分类编辑</div>' +
      '<div class="feature-item"><span class="feature-icon">🎯</span><span class="feature-text">点击分类图标 → 更换图标（42 个可选）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">✏️</span><span class="feature-text">点击分类名称 → 修改分类名（同名自动合并）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📝</span><span class="feature-text">点击网站名称 → 修改显示名（导出时用）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">⇅</span><span class="feature-text">点击 ⇅ 按钮 → 移动到其他分类</span></div>' +
      '<div class="feature-item"><span class="feature-icon">↑↓</span><span class="feature-text">点击 ↑↓ 按钮 → 调整分类顺序</span></div>' +
      '<div class="feature-item"><span class="feature-icon">🎨</span><span class="feature-text">6 套背景主题：纯净白 / 极夜黑 / 海洋蓝 / 落日橙 / 森林绿 / 极光紫</span></div>' +

      '<div class="section-title">📝 使用方法</div>' +
      '<div class="guide-step"><span class="step-num">1️⃣</span><span class="step-text">在上方输入框粘贴链接，一行一个</span></div>' +
      '<div class="guide-step"><span class="step-num">2️⃣</span><span class="step-text">点击"开始生成"按钮，自动解析和分类</span></div>' +
      '<div class="guide-step"><span class="step-num">3️⃣</span><span class="step-text">预览结果，可自由编辑分类图标/名称/排序/移动网站</span></div>' +
      '<div class="guide-step"><span class="step-num">4️⃣</span><span class="step-text">选择喜欢的背景主题</span></div>' +
      '<div class="guide-step"><span class="step-num">5️⃣</span><span class="step-text">点击"下载导航站文件"导出</span></div>' +

      '<div class="section-title">💡 输入格式</div>' +
      '<div class="format-intro">以下格式都可以，按习惯选择：</div>' +
      '<div class="format-example"><span class="format-label">格式1：只粘贴链接</span><span class="format-code">https://github.com</span></div>' +
      '<div class="format-example"><span class="format-label">格式2：链接 + 中文名</span><span class="format-code">https://chat.deepseek.com DeepSeek AI助手</span></div>' +
      '<div class="format-example"><span class="format-label">格式3：自定义分类</span><span class="format-code">https://www.bilibili.com/ 哔哩哔哩（视频）</span></div>' +
      '<div class="format-note">💡 用括号标注分类名，如（视频）、（工具），会自动创建新分类</div>' +

      '<div class="section-title">⚠️ 注意事项</div>' +
      '<div class="note-item"><span class="note-icon">📱</span><span class="note-text">生成的是静态 HTML 文件，可在任何浏览器打开</span></div>' +
      '<div class="note-item"><span class="note-icon">💾</span><span class="note-text">建议先在电脑上测试，确认无误后再使用</span></div>' +
      '<div class="note-item"><span class="note-icon">🌐</span><span class="note-text">HTML 文件支持部署到服务器，生成可分享的网页链接</span></div>'
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
  // 链接输入
  $('linkInput').addEventListener('input', function() {
    state.linkText = this.value;
    $('formatTip').style.display = this.value ? 'none' : 'block';
  });

  // 解析按钮
  $('parseBtn').addEventListener('click', onParse);

  // 导出按钮
  $('exportBtn').addEventListener('click', onExport);

  // 重置按钮
  $('resetBtn').addEventListener('click', onReset);

  // 使用说明
  $('guideBtn').addEventListener('click', showGuide);
}

// ===== 初始化 =====
function init() {
  renderThemes();
  bindEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
