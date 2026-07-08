var fs = require('fs');
var code = fs.readFileSync(process.argv[2], 'utf8');

// 模拟浏览器环境
var globalThis = global;
globalThis.document = {
  getElementById: function(id) { return null; },
  querySelectorAll: function(sel) { return []; },
  addEventListener: function() {},
  readyState: 'complete'
};
globalThis.window = globalThis;
globalThis.$ = function(id) { return null; };
globalThis.localStorage = {
  getItem: function() { return null; },
  setItem: function() {},
  removeItem: function() {}
};
globalThis.showModal = function() {};
globalThis.closeModal = function() {};
globalThis.showToast = function() {};
globalThis.showConfirm = function() { return Promise.resolve(false); };
globalThis.showPrompt = function() { return Promise.resolve(''); };
globalThis.fallbackCopy = function() {};
globalThis.navigator = { clipboard: { writeText: function() { return Promise.resolve(); } } };
globalThis.CORS_PROXY_PRIMARY = 'https://api.allorigins.win/head?url=';
globalThis.CORS_PROXY_FALLBACK = 'https://corsproxy.io/?';

try {
  eval(code);
  console.log('IIFE executed OK');
  console.log('generateCustomTheme type:', typeof generateCustomTheme);
  console.log('confirmColor type:', typeof confirmColor);
  console.log('openColorPicker type:', typeof openColorPicker);
  console.log('customThemeColor:', typeof customThemeColor);
  if (typeof generateCustomTheme !== 'function') {
    console.log('ERROR: generateCustomTheme is not a function!');
  }
} catch(e) {
  console.error('FATAL ERROR: ' + e.message);
  console.error('Stack trace:');
  console.error(e.stack);
}
