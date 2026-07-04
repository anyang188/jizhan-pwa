/**
 * HTML 生成器（从小程序迁移，改为全局变量导出）
 */

function generateDataJs(navData) {
  const escaped = navData.map(group => {
    const sites = group.sites.map(site => {
      return '      { name: ' + quote(site.name) + ', icon: ' + quote(site.icon) + ', desc: ' + quote(site.desc) + ', url: ' + quote(site.url) + ', tag: ' + quote(site.tag) + ' }';
    }).join(',\n');
    return '  {\n    category: ' + quote(group.categoryIcon + ' ' + group.categoryName) + ',\n    sites: [\n' + sites + '\n    ]\n  }';
  }).join(',\n');
  return 'const navData = [\n' + escaped + '\n];';
}

function quote(str) {
  if (!str) return "''";
  return "'" + String(str).replace(/'/g, "\\'") + "'";
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function generateAppJS() {
  return `(function() {
  'use strict';
  var searchInput = document.getElementById('searchInput');
  var navContainer = document.getElementById('navContainer');
  var backTop = document.getElementById('backTop');

  function init() { renderNav(); bindEvents(); }

  function renderNav() {
    var html = '';
    navData.forEach(function(section) {
      html += '<div class="nav-section">';
      html += '<h2 class="nav-section-title">' + section.category + '</h2>';
      html += '<div class="nav-grid">';
      section.sites.forEach(function(site) {
        html += '<a href="' + escapeAttr(site.url) + '" target="_blank" class="nav-card" data-search-text="' +
          escapeAttr(site.name + ' ' + site.desc + ' ' + section.category) + '">';
        html += '<div class="nav-card-icon">' + site.icon + '</div>';
        html += '<div class="nav-card-info">';
        html += '<div class="nav-card-name">' + site.name + '</div>';
        html += '<div class="nav-card-desc">' + site.desc + '</div>';
        html += '</div>';
        if (site.tag) html += '<span class="nav-card-tag">' + site.tag + '</span>';
        html += '</a>';
      });
      html += '</div></div>';
    });
    navContainer.innerHTML = html;
  }

  function bindEvents() {
    searchInput.addEventListener('input', function() {
      var query = this.value.trim().toLowerCase();
      var cards = navContainer.querySelectorAll('.nav-card');
      cards.forEach(function(card) {
        var text = (card.dataset.searchText || '').toLowerCase();
        card.style.display = (!query || text.indexOf(query) !== -1) ? '' : 'none';
      });
      var sections = navContainer.querySelectorAll('.nav-section');
      sections.forEach(function(section) {
        var total = section.querySelectorAll('.nav-card').length;
        var hidden = section.querySelectorAll('.nav-card[style*="display: none"]').length;
        section.style.display = hidden === total ? 'none' : '';
      });
    });
    window.addEventListener('scroll', function() {
      backTop.classList.toggle('visible', window.scrollY > 400);
    });
    backTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  init();
})();`;
}

window.HtmlGenerator = {
  generateDataJs,
  generateAppJS,
  escapeHtml,
  escapeAttr
};
