/**
 * 分类规则引擎 - 关键词匹配
 * (从小程序迁移，改为全局变量导出)
 */

// 分类词库
const CATEGORY_RULES = [
  {
    name: "AI 对话",
    icon: "🤖",
    keywords: ["deepseek", "kimi", "chatgpt", "claude", "gemini", "通义", "文心", "智谱", "豆包", "grok", "poe", "copilot", "moonshot", "bailian", "volcengine", "qianfan", "yiyan", "chatglm", "tongyi", "deepseek.com", "kimi.moonshot", "chat.openai", "claude.ai", "gemini.google", "grok.com", "poe.com", "copilot.microsoft"],
    color: "#4F6EF7"
  },
  {
    name: "AI 创作",
    icon: "🎨",
    keywords: ["midjourney", "stable diffusion", "sd", "可灵", "即梦", "suno", "剪映", "canva", "remove.bg", "klingai", "jimeng", "midjourney.com", "stablediffusionweb", "suno.com", "jianying", "canva.cn", "remove.bg", "可灵AI", "即梦AI"],
    color: "#8B5CF6"
  },
  {
    name: "效率办公",
    icon: "📊",
    keywords: ["notion", "飞书", "dingtalk", "钉钉", "腾讯文档", "石墨", "processon", "xmind", "gamma", "feishu", "notion.so", "feishu.cn", "dingtalk.com", "docs.qq.com", "shimo.im", "processon.com", "xmind.cn", "gamma.app"],
    color: "#F59E0B"
  },
  {
    name: "开发者工具",
    icon: "💻",
    keywords: ["github", "vercel", "cloudflare", "cursor", "codepen", "stackoverflow", "npm", "docker", "gitlab", "github.com", "vercel.com", "cloudflare.com", "cursor.sh", "codepen.io", "stackoverflow.com"],
    color: "#22C55E"
  },
  {
    name: "搜索引擎",
    icon: "🔍",
    keywords: ["google", "baidu", "bing", "sogou", "so.com", "google.com", "baidu.com", "bing.com", "sogou.com", "haosou"],
    color: "#EF4444"
  },
  {
    name: "视频平台",
    icon: "📺",
    keywords: ["bilibili", "youtube", "douyin", "tiktok", "kuaishou", "vimeo", "bilibili.com", "youtube.com", "douyin.com", "tiktok.com", "kuaishou.com", "vimeo.com"],
    color: "#EC4899"
  },
  {
    name: "社交社区",
    icon: "💬",
    keywords: ["zhihu", "weibo", "xiaohongshu", "reddit", "twitter", "facebook", "instagram", "linkedin", "jianshu", "segmentfault", "csdn", "zhihu.com", "weibo.com", "xiaohongshu.com", "reddit.com", "jianshu.com", "csdn.net", "segmentfault.com"],
    color: "#06B6D4"
  },
  {
    name: "电商平台",
    icon: "🛒",
    keywords: ["taobao", "tmall", "jd", "pinduoduo", "amazon", "ebay", "1688", "suning", "weishang", "taobao.com", "tmall.com", "jd.com", "pinduoduo.com", "amazon.com", "1688.com", "suning.com"],
    color: "#F97316"
  },
  {
    name: "设计工具",
    icon: "🖌️",
    keywords: ["figma", "sketch", "photoshop", "adobe", "canva", "mastergo", "即时设计", "蓝湖", "figma.com", "sketchapp.com", "adobe.com", "mastergo.com", "jishu.design", "lanhuapp.com"],
    color: "#A855F7"
  },
  {
    name: "云存储",
    icon: "☁️",
    keywords: ["百度网盘", "阿里云盘", "腾讯云", "坚果云", "dropbox", "onedrive", "google drive", "pan.baidu.com", "aliyundrive.com", "坚果云", "dropbox.com", "onedrive.live.com"],
    color: "#64748B"
  },
  {
    name: "新闻阅读",
    icon: "📰",
    keywords: ["toutiao", "36kr", "huxiu", "ifanr", "ithome", "sspai", "少数派", "36氪", "虎嗅", "爱范儿", "机器之心", "newrank", "toutiao.com", "36kr.com", "huxiu.com", "ifanr.com", "ithome.com", "sspai.com"],
    color: "#78716C"
  },
  {
    name: "其他",
    icon: "📁",
    keywords: [],
    color: "#94A3B8"
  }
];

function extractUrls(text) {
  if (!text) return [];
  const urlRegex = /(https?:\/\/|www\.)[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^ \t\n\r,;)]+/g;
  let urls = text.match(urlRegex) || [];
  urls = urls.map(url => {
    url = url.replace(/[.,;!?)]+$/, '');
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }
    try { new URL(url); return url; } catch (e) { return null; }
  }).filter(Boolean);
  return urls;
}

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}

function classifyUrl(url, title) {
  title = title || '';
  const combined = (url + ' ' + title).toLowerCase();
  const domain = extractDomain(url).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw) || domain.includes(kw)) return rule;
    }
  }
  return CATEGORY_RULES[CATEGORY_RULES.length - 1];
}

const CATEGORY_ALIASES = {
  "ai对话": "AI 对话", "ai对话工具": "AI 对话", "大模型": "AI 对话", "chat": "AI 对话", "对话": "AI 对话",
  "ai创作": "AI 创作", "ai绘画": "AI 创作", "ai绘图": "AI 创作", "图像生成": "AI 创作", "视频生成": "AI 创作", "音乐生成": "AI 创作", "创作": "AI 创作",
  "效率办公": "效率办公", "办公": "效率办公", "协作": "效率办公", "文档": "效率办公", "项目管理": "效率办公",
  "开发者工具": "开发者工具", "开发": "开发者工具", "编程": "开发者工具", "代码": "开发者工具", "git": "开发者工具",
  "搜索引擎": "搜索引擎", "搜索": "搜索引擎",
  "视频平台": "视频平台", "视频": "视频平台", "影视": "视频平台", "b站": "视频平台", "哔哩哔哩": "视频平台",
  "社交社区": "社交社区", "社交": "社交社区", "社区": "社交社区", "论坛": "社交社区",
  "电商平台": "电商平台", "电商": "电商平台", "购物": "电商平台", "淘宝": "电商平台", "京东": "电商平台", "拼多多": "电商平台",
  "设计工具": "设计工具", "设计": "设计工具", "ui": "设计工具", "ps": "设计工具", "figma": "设计工具",
  "云存储": "云存储", "网盘": "云存储", "存储": "云存储", "下载": "云存储",
  "新闻阅读": "新闻阅读", "新闻": "新闻阅读", "资讯": "新闻阅读", "阅读": "新闻阅读", "博客": "新闻阅读",
  "其他": "其他", "默认": "其他", "misc": "其他", "杂项": "其他"
};

function findCategoryByName(name) {
  const lower = name.toLowerCase();
  if (CATEGORY_RULES.some(r => r.name === name)) {
    return CATEGORY_RULES.find(r => r.name === name);
  }
  for (const [alias, realName] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias) || alias.includes(lower)) {
      return CATEGORY_RULES.find(r => r.name === realName) || CATEGORY_RULES[CATEGORY_RULES.length - 1];
    }
  }
  for (const rule of CATEGORY_RULES) {
    if (lower.includes(rule.name.toLowerCase()) || rule.name.toLowerCase().includes(lower)) {
      return rule;
    }
  }
  return CATEGORY_RULES[CATEGORY_RULES.length - 1];
}

const NAME_MAP = {
  'chat.deepseek.com': 'DeepSeek',
  'kimi.moonshot.cn': 'Kimi',
  'chat.openai.com': 'ChatGPT',
  'claude.ai': 'Claude',
  'grok.com': 'Grok',
  'gemini.google.com': 'Gemini',
  'poe.com': 'Poe',
  'copilot.microsoft.com': 'Copilot',
  'tongyi.aliyun.com': '通义千问',
  'yiyan.baidu.com': '文心一言',
  'chatglm.cn': '智谱清言',
  'www.doubao.com': '豆包',
  'midjourney.com': 'Midjourney',
  'stablediffusionweb.com': 'Stable Diffusion',
  'klingai.kuaishou.com': '可灵AI',
  'jimeng.jianying.com': '即梦AI',
  'suno.com': 'Suno',
  'www.jianying.com': '剪映',
  'www.canva.cn': 'Canva',
  'www.remove.bg': 'Remove.bg',
  'www.notion.so': 'Notion',
  'www.feishu.cn': '飞书',
  'www.dingtalk.com': '钉钉',
  'docs.qq.com': '腾讯文档',
  'shimo.im': '石墨文档',
  'www.processon.com': 'ProcessOn',
  'xmind.cn': 'XMind',
  'gamma.app': 'Gamma',
  'github.com': 'GitHub',
  'github.com/features/copilot': 'GitHub Copilot',
  'cursor.sh': 'Cursor',
  'vercel.com': 'Vercel',
  'www.cloudflare.com': 'Cloudflare',
  'codepen.io': 'CodePen',
  'stackoverflow.com': 'Stack Overflow',
  'npmjs.com': 'NPM',
  'docker.com': 'Docker',
  'gitlab.com': 'GitLab',
  'www.google.com': 'Google',
  'www.baidu.com': '百度',
  'www.bing.com': 'Bing',
  'www.sogou.com': '搜狗',
  'haosou.com': '360搜索',
  'www.bilibili.com': '哔哩哔哩',
  'www.youtube.com': 'YouTube',
  'www.douyin.com': '抖音',
  'www.tiktok.com': 'TikTok',
  'www.kuaishou.com': '快手',
  'www.vimeo.com': 'Vimeo',
  'www.zhihu.com': '知乎',
  'weibo.com': '微博',
  'www.xiaohongshu.com': '小红书',
  'www.reddit.com': 'Reddit',
  'twitter.com': 'X(Twitter)',
  'www.facebook.com': 'Facebook',
  'www.instagram.com': 'Instagram',
  'www.linkedin.com': 'LinkedIn',
  'www.jianshu.com': '简书',
  'www.csdn.net': 'CSDN',
  'segmentfault.com': 'SegmentFault',
  'www.taobao.com': '淘宝',
  'www.tmall.com': '天猫',
  'www.jd.com': '京东',
  'www.pinduoduo.com': '拼多多',
  'www.amazon.com': '亚马逊',
  'www.1688.com': '1688',
  'www.suning.com': '苏宁',
  'www.figma.com': 'Figma',
  'www.sketchapp.com': 'Sketch',
  'www.adobe.com': 'Adobe',
  'mastergo.com': 'MasterGo',
  'jishu.design': '即时设计',
  'lanhuapp.com': '蓝湖',
  'pan.baidu.com': '百度网盘',
  'www.aliyundrive.com': '阿里云盘',
  'www.jianguoyun.com': '坚果云',
  'www.dropbox.com': 'Dropbox',
  'onedrive.live.com': 'OneDrive',
  'www.toutiao.com': '今日头条',
  '36kr.com': '36氪',
  'www.huxiu.com': '虎嗅',
  'www.ifanr.com': '爱范儿',
  'www.ithome.com': 'IT之家',
  'sspai.com': '少数派',
  'music.163.com': '网易云音乐',
  'tieba.baidu.com': '百度贴吧',
  'mail.qq.com': 'QQ邮箱',
  'docs.google.com': 'Google Docs',
  'sheets.google.com': 'Google Sheets',
  'calendar.google.com': 'Google日历',
};

function parseLinks(text) {
  if (!text) return [];
  const lines = text.split(/[\n\r,;，；]+/).map(l => l.trim()).filter(Boolean);
  const results = [];
  const seenDomains = new Set();

  for (const line of lines) {
    let url = '';
    let title = '';
    let desc = '';

    const urlMatch = line.match(/(https?:\/\/[^\s|]+|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}[^\s|]*)/);
    if (!urlMatch) continue;

    url = urlMatch[0].replace(/[.,;!?)]+$/, '');
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    let afterUrl = line.substring(urlMatch.index + urlMatch[0].length).trim();

    var dcIdx = url.indexOf('::', 8);
    if (dcIdx !== -1) {
      var rest = url.substring(dcIdx + 2).trim();
      url = url.substring(0, dcIdx);
      afterUrl = (rest + ' ' + afterUrl).trim();
    }

    const domain = extractDomain(url);
    if (seenDomains.has(domain)) continue;
    seenDomains.add(domain);

    if (afterUrl) {
      const parts = afterUrl.split(/\|::?|::/);
      title = (parts[0] || '').trim();
      desc = (parts[1] || '').trim();
    }

    if (!title) {
      title = NAME_MAP[domain] || NAME_MAP['www.' + domain] || domain;
    }

    let forcedCategory = null;
    const catMatch = title.match(/(.+)\s*[（(](.+?)[）)]$/);
    if (catMatch) {
      title = catMatch[1].trim();
      forcedCategory = catMatch[2].trim();
    }

    const category = forcedCategory
      ? (CATEGORY_RULES.find(r => r.name === forcedCategory) || { name: forcedCategory, icon: '📁', color: '#94A3B8' })
      : classifyUrl(url, title);

    results.push({
      name: title,
      icon: category.icon,
      desc: desc || '',
      url: url,
      tag: '',
      category: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color
    });
  }

  return results;
}

function groupByCategory(sites) {
  const groups = {};
  sites.forEach(site => {
    const cat = site.category;
    if (!groups[cat]) {
      groups[cat] = {
        categoryName: cat,
        categoryIcon: site.categoryIcon,
        categoryColor: site.categoryColor,
        sites: []
      };
    }
    groups[cat].sites.push({
      name: site.name,
      icon: site.icon,
      desc: site.desc,
      url: site.url,
      tag: site.tag
    });
  });
  return Object.values(groups);
}

// 全局导出（PWA 不使用模块系统）
window.Classifier = {
  CATEGORY_RULES,
  extractUrls,
  extractDomain,
  classifyUrl,
  findCategoryByName,
  parseLinks,
  groupByCategory
};
