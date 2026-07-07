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
  { id: 'ocean', name: '海洋蓝',
    css: { '--bg': '#e8f4fd', '--card-bg': '#ffffff', '--text': '#1a365d',
      '--text-secondary': '#4a6fa5', '--border': '#bee3f8', '--shadow': '0 2px 12px rgba(26,54,93,0.08)',
      '--header-bg': 'linear-gradient(135deg, #2b6cb0 0%, #63b3ed 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#e8f4fd', cardBg: '#ffffff', text: '#1a365d' } },
  { id: 'sunset', name: '落日橙', color: '#dd6b20',
    css: { '--bg': '#fff5f0', '--card-bg': '#ffffff', '--text': '#5d3a1a',
      '--text-secondary': '#b87c4a', '--border': '#ffe0cc', '--shadow': '0 2px 12px rgba(93,58,26,0.08)',
      '--header-bg': 'linear-gradient(135deg, #dd6b20 0%, #f6ad55 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#fff5f0', cardBg: '#ffffff', text: '#5d3a1a' } },
  { id: 'forest', name: '森林绿', color: '#276749',
    css: { '--bg': '#f0f7f0', '--card-bg': '#ffffff', '--text': '#1a3d2e',
      '--text-secondary': '#4a7a5e', '--border': '#d4e8d4', '--shadow': '0 2px 12px rgba(26,61,46,0.08)',
      '--header-bg': 'linear-gradient(135deg, #276749 0%, #68d391 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#f0f7f0', cardBg: '#ffffff', text: '#1a3d2e' } },
  { id: 'aurora', name: '极光紫', color: '#6b46c1',
    css: { '--bg': '#f5f0ff', '--card-bg': '#ffffff', '--text': '#2d1a5d',
      '--text-secondary': '#7a4ab8', '--border': '#e0ccff', '--shadow': '0 2px 12px rgba(45,26,93,0.08)',
      '--header-bg': 'linear-gradient(135deg, #6b46c1 0%, #b794f4 100%)', '--header-text': '#ffffff' },
    preview: { bg: '#f5f0ff', cardBg: '#ffffff', text: '#2d1a5d' } }
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
  moveSiteIndex: -1
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
    id: 'custom', name: '\u81ea\u5b9a\u4e49', color: c,
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

// ===== 主题渲染 =====
function renderThemes() {
  var html = '';
  THEMES.forEach(function(t) {
    var active = state.currentTheme === t.id;
    html += '<div class="theme-item ' + (active ? 'theme-active' : '') + '" data-theme="' + t.id + '">' +
      '<div class="theme-color" style="background:' + t.color + ';">' +
        '<span class="theme-icon">' + (active ? 'V' : '') + '</span>' +
      '</div>' +
      '<span class="theme-name">' + t.name + '</span>' +
    '</div>';
  });
  // 自定义主题（如果已选过）
  if (customThemeColor) {
    var ca = state.currentTheme === 'custom';
    html += '<div class="theme-item ' + (ca ? 'theme-active' : '') + '" data-theme="custom" data-custom="1">' +
      '<div class="theme-color" style="background:' + customThemeColor + ';">' +
        '<span class="theme-icon">' + (ca ? 'V' : '') + '</span>' +
      '</div>' +
      '<span class="theme-name">\u81ea\u5b9a\u4e49</span>' +
    '</div>';
  }
  // 自定义取色器入口
  html += '<div class="theme-item theme-picker-btn" id="themePickerBtn">' +
    '<div class="theme-color" style="background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);">' +
      '<span class="theme-icon" style="color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);">\u2716</span>' +
    '</div>' +
    '<span class="theme-name">\u81ea\u5b9a\u4e49</span>' +
  '</div>';

  var picker = $('themePicker');
  picker.innerHTML = html;

  // 预设主题点击
  picker.querySelectorAll('.theme-item[data-theme]').forEach(function(item) {
    item.addEventListener('click', function() {
      var themeId = this.getAttribute('data-theme');
      var isCustom = this.getAttribute('data-custom') === '1';
      var theme;
      if (isCustom) {
        theme = generateCustomTheme(customThemeColor);
      } else {
        theme = THEMES.find(function(t) { return t.id === themeId; }) || THEMES[0];
      }
      state.currentTheme = themeId;
      state.themeStyle = theme.preview;
      renderThemes();
      updatePreviewColors();
      saveState();
    });
  });

  // 自定义取色器按钮
  var pickerBtn = $('themePickerBtn');
  if (pickerBtn) {
    pickerBtn.addEventListener('click', function() {
      var input = document.createElement('input');
      input.type = 'color';
      input.value = customThemeColor || '#4F6EF7';
      input.addEventListener('input', function() {
        customThemeColor = this.value;
        try { localStorage.setItem('jizhan_theme_color', customThemeColor); } catch(e) {}
        var theme = generateCustomTheme(customThemeColor);
        state.currentTheme = 'custom';
        state.themeStyle = theme.preview;
        renderThemes();
        updatePreviewColors();
        saveState();
      });
      input.click();
    });
  }
}

function updatePreviewColors() {
  var card = $('previewCard');
  if (card.style.display !== 'none') {
    card.style.background = state.themeStyle.cardBg;
    $('previewTitle').style.color = state.themeStyle.text;
  }
  $('app').style.background = state.themeStyle.bg;
}

// ===== 分类预览渲染 =====
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
      html += '<span class="site-icon editable" data-act="editSiteIcon" data-cat="' + catIndex + '" data-site="' + siteIndex + '">' + site.icon + '</span>';
      html += '<span class="site-name editable" data-act="editSiteName" data-cat="' + catIndex + '" data-site="' + siteIndex + '">' + escapeHtml(site.name) + '</span>';
      html += '<span class="site-action-btn" data-act="siteAction" data-cat="' + catIndex + '" data-site="' + siteIndex + '">⇅</span>';
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
      '<div class="section-title">✨ 主要功能</div>' +
      '<div class="feature-item"><span class="feature-icon">🔗</span><span class="feature-text">粘贴链接，自动解析网址和中文名</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📂</span><span class="feature-text">智能分类：AI 工具、搜索引擎、社交平台等</span></div>' +
      '<div class="feature-item"><span class="feature-icon">🎨</span><span class="feature-text">一键生成精美导航站 HTML 文件</span></div>' +

      '<div class="section-title">✏️ 分类编辑</div>' +
      '<div class="feature-item"><span class="feature-icon">🎯</span><span class="feature-text">点击分类图标 → 更换图标（42 个可选）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">✏️</span><span class="feature-text">点击分类名称 → 修改分类名（同名自动合并）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">📝</span><span class="feature-text">点击网站名称 → 修改显示名（导出时用）</span></div>' +
      '<div class="feature-item"><span class="feature-icon">⇅</span><span class="feature-text">点击 ⇅ 按钮 → 弹出操作面板，可选择移动到其它分类或删除站点</span></div>' +
      '<div class="feature-item"><span class="feature-icon">↑↓</span><span class="feature-text">点击 ↑↓ 按钮 → 调整分类顺序</span></div>' +
      '<div class="feature-item"><span class="feature-icon">🎨</span><span class="feature-text">6 套背景主题 + 自定义取色器</span></div>' +

      '<div class="section-title">📝 使用方法</div>' +
      '<div class="guide-step"><span class="step-num">1️⃣</span><span class="step-text">在上方输入框粘贴链接，一行一个</span></div>' +
      '<div class="guide-step"><span class="step-num">2️⃣</span><span class="step-text">点击"解析链接"按钮，自动解析和分类</span></div>' +
      '<div class="guide-step"><span class="step-num">3️⃣</span><span class="step-text">预览结果，可自由编辑分类图标/名称/排序/移动网站</span></div>' +
      '<div class="guide-step"><span class="step-num">4️⃣</span><span class="step-text">选择喜欢的背景主题</span></div>' +
      '<div class="guide-step"><span class="step-num">5️⃣</span><span class="step-text">点击"下载导航站文件"导出</span></div>' +

      '<div class="section-title">💡 输入格式</div>' +
      '<div class="format-intro">以下格式都可以，按习惯选择：</div>' +
      '<div class="format-example"><span class="format-label">格式1：只粘贴链接</span><span class="format-code">https://github.com</span></div>' +
      '<div class="format-example"><span class="format-label">格式2：链接 + 中文名</span><span class="format-code">https://chat.deepseek.com DeepSeek AI助手</span></div>' +
      '<div class="format-example"><span class="format-label">格式3：自定义分类</span><span class="format-code">https://www.bilibili.com/ 哔哩哔哩（视频）</span></div>' +
      '<div class="format-note">💡 用括号标注分类名，如（视频）、（工具），会自动创建新分类</div>' +

      '<div class="section-title">🗑 删除站点</div>' +
      '<div class="note-item"><span class="note-icon">🗑</span><span class="note-text">点击站点右侧 ⇅ 按钮，在弹出面板中选择「删除」，确认后即刻移除。若分类下所有站点均被删除，该分类将自动移除。</span></div>' +

      '<div class="section-title">⚠️ 注意事项</div>' +
      '<div class="note-item"><span class="note-icon">📱</span><span class="note-text">生成的是静态 HTML 文件，可在任何浏览器打开</span></div>' +
      '<div class="note-item"><span class="note-icon">💾</span><span class="note-text">建议先在电脑上测试，确认无误后再使用</span></div>' +
      '<div class="note-item"><span class="note-icon">🌐</span><span class="note-text">HTML 文件支持部署到服务器，生成可分享的网页链接</span></div>' +

      '<div class="section-title">🌐 代部署服务</div>' +
      '<div class="feature-item"><span class="feature-icon">🛠️</span><span class="feature-text">不想自己动手？帮你把导航站部署到线上，生成可分享的链接 · 费用 <strong>5 元起</strong></span></div>' +
      '<div class="feature-item"><span class="feature-icon">📞</span><span class="feature-text">联系微信：<strong>anyang0188</strong>（备注"导航站部署"）</span></div>'
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
  if (restored) {
    renderClassifiedData();
    updatePreviewColors();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
