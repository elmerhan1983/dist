import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { company } from './data/content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const port = process.env.PORT || 3000;
const siteUrl = String(process.env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, '');
const assetVersion = process.env.ASSET_VERSION || String(Date.now());
const seriesPath = path.join(__dirname, 'data', 'series.json');
const productsPath = path.join(__dirname, 'data', 'products.json');
const wikiPath = path.join(__dirname, 'data', 'wiki.json');
const pageLayoutPath = path.join(__dirname, 'data', 'page-layout.json');
const siteSettingsPath = path.join(__dirname, 'data', 'site-settings.json');
const inquiriesPath = path.join(__dirname, 'data', 'inquiries.json');

const DEFAULT_SECTION_LAYOUT = [
  { key: 'hero', label: 'Hero', enabled: true, sortOrder: 1 },
  { key: 'banners', label: 'Banners', enabled: true, sortOrder: 2 },
  { key: 'series', label: 'Product Series', enabled: true, sortOrder: 3 },
  { key: 'company', label: 'Company + Video', enabled: true, sortOrder: 4 },
  { key: 'wiki', label: 'Wiki Highlights', enabled: true, sortOrder: 5 },
  { key: 'inquiry', label: 'Inquiry CTA', enabled: true, sortOrder: 6 }
];

const USERNAME = 'demo@sj.com';
const PASSWORD = '12345678';
const SUPPORTED_LANGS = new Set(['en', 'zh', 'zh-tw']);
const DEFAULT_LANG = 'en';

const I18N_TEXT = {
  en: {
    navHome: 'Home',
    navProducts: 'Products',
    navCompany: 'Company',
    navWiki: 'Wiki',
    navInquiry: 'Inquiry',
    navDownloads: 'Downloads',
    navAdmin: 'Admin',
    login: 'Login',
    logout: 'Logout',
    exploreProducts: 'Explore Products',
    requestQuotation: 'Request Quotation',
    more: 'More',
    productSeries: 'Product Series',
    viewSeries: 'View Series',
    companyIntroduction: 'Company Introduction',
    founded: 'Founded',
    headquarters: 'Headquarters',
    certifications: 'Certifications',
    technicalWikiHighlights: 'Technical Wiki Highlights',
    productSeriesHint: 'Each series contains multiple products. Open a series to view full models.',
    openSeries: 'Open Series',
    productsCount: 'Products',
    noProductsInSeries: 'No products in this series yet.',
    backToSeries: 'Back to Series',
    backToProductSeries: 'Back to Product Series',
    viewProduct: 'View Product',
    exportPdf: 'Export PDF',
    shareThisProduct: 'Share This Product',
    inquiryForProduct: 'Inquiry for this Product',
    submitProductInquiry: 'Submit Product Inquiry',
    submitInquiry: 'Submit Inquiry',
    nameRequired: 'Name*',
    companyField: 'Company',
    emailRequired: 'Email*',
    phoneField: 'Phone',
    messageRequired: 'Message*',
    productInterest: 'Product Interest',
    other: 'Other',
    technicalWiki: 'Technical Wiki',
    searchTechnicalTopics: 'Search technical topics...',
    search: 'Search',
    updated: 'Updated',
    noWikiMatched: 'No article matched your query.',
    backToWiki: 'Back to Wiki',
    downloads: 'Downloads',
    downloadsIntro: 'Access brochures, manuals, and technical documents by permission category.',
    publicDownloads: 'Public Downloads',
    publicDownload: 'Public Download',
    noPublicDownloads: 'No Public Downloads',
    noPublicDownloadsHint: 'Admin can mark files as public in Site Settings.',
    loginRequiredDownloads: 'Login Required Downloads',
    loginRequired: 'Login Required',
    loginToDownload: 'Login to Download',
    noRestrictedDownloads: 'No Restricted Downloads',
    noRestrictedDownloadsHint: 'Admin can mark files as login-required in Site Settings.',
    download: 'Download',
    accountLogin: 'Account Login',
    demoAccountHint: 'Demo account for protected downloads:',
    password: 'Password',
    about: 'About',
    capabilities: 'Capabilities',
    notFoundTitle: '404',
    notFoundDesc: 'Sorry, the page you requested does not exist.',
    goHome: 'Go Home',
    social: 'Social',
    contact: 'Contact',
    language: 'Language',
    langEN: 'EN',
    langZH: '简中',
    langZHTW: '繁中',
    categoryDefault: 'General',
    defaultBannerAlt: 'Default banner',
    noBannerConfigured: 'No banner configured'
  },
  zh: {
    navHome: '首页',
    navProducts: '产品',
    navCompany: '公司',
    navWiki: '技术Wiki',
    navInquiry: '询盘',
    navDownloads: '下载',
    navAdmin: '后台',
    login: '登录',
    logout: '退出登录',
    exploreProducts: '查看产品',
    requestQuotation: '获取报价',
    more: '更多',
    productSeries: '产品系列',
    viewSeries: '查看系列',
    companyIntroduction: '公司介绍',
    founded: '成立时间',
    headquarters: '总部',
    certifications: '认证',
    technicalWikiHighlights: '技术 Wiki 精选',
    productSeriesHint: '系列下包含多个具体产品，可进入系列页查看完整型号。',
    openSeries: '进入系列',
    productsCount: '产品数',
    noProductsInSeries: '该系列暂无产品。',
    backToSeries: '返回系列',
    backToProductSeries: '返回产品系列',
    viewProduct: '查看产品',
    exportPdf: '导出 PDF',
    shareThisProduct: '分享该产品',
    inquiryForProduct: '产品询盘',
    submitProductInquiry: '提交产品询盘',
    submitInquiry: '提交询盘',
    nameRequired: '姓名*',
    companyField: '公司',
    emailRequired: '邮箱*',
    phoneField: '电话',
    messageRequired: '留言*',
    productInterest: '感兴趣产品',
    other: '其他',
    technicalWiki: '技术 Wiki',
    searchTechnicalTopics: '搜索技术主题...',
    search: '搜索',
    updated: '更新于',
    noWikiMatched: '未找到匹配内容。',
    backToWiki: '返回 Wiki',
    downloads: '下载中心',
    downloadsIntro: '按权限分类下载资料、手册与技术文档。',
    publicDownloads: '公开下载',
    publicDownload: '公开',
    noPublicDownloads: '暂无公开下载',
    noPublicDownloadsHint: '后台可在站点设置中将文件设为公开。',
    loginRequiredDownloads: '登录后下载',
    loginRequired: '需要登录',
    loginToDownload: '登录后下载',
    noRestrictedDownloads: '暂无受限下载',
    noRestrictedDownloadsHint: '后台可在站点设置中将文件设为需登录。',
    download: '下载',
    accountLogin: '账号登录',
    demoAccountHint: '受限下载演示账号：',
    password: '密码',
    about: '关于',
    capabilities: '能力',
    notFoundTitle: '404',
    notFoundDesc: '抱歉，您访问的页面不存在。',
    goHome: '回到首页',
    social: '社媒',
    contact: '联系',
    language: '语言',
    langEN: 'EN',
    langZH: '简中',
    langZHTW: '繁中',
    categoryDefault: '通用',
    defaultBannerAlt: '默认 Banner',
    noBannerConfigured: '未配置 Banner'
  },
  'zh-tw': {
    navHome: '首頁',
    navProducts: '產品',
    navCompany: '公司',
    navWiki: '技術Wiki',
    navInquiry: '詢盤',
    navDownloads: '下載',
    navAdmin: '後台',
    login: '登入',
    logout: '登出',
    exploreProducts: '查看產品',
    requestQuotation: '獲取報價',
    more: '更多',
    productSeries: '產品系列',
    productSeriesHint: '系列下包含多個具體產品，可進入系列頁查看完整型號。',
    viewSeries: '查看系列',
    companyIntroduction: '公司介紹',
    founded: '成立時間',
    headquarters: '總部',
    certifications: '認證',
    technicalWikiHighlights: '技術 Wiki 精選',
    openSeries: '進入系列',
    productsCount: '產品數',
    noProductsInSeries: '該系列暫無產品。',
    backToSeries: '返回系列',
    backToProductSeries: '返回產品系列',
    viewProduct: '查看產品',
    exportPdf: '匯出 PDF',
    shareThisProduct: '分享該產品',
    inquiryForProduct: '產品詢盤',
    submitProductInquiry: '提交產品詢盤',
    submitInquiry: '提交詢盤',
    nameRequired: '姓名*',
    companyField: '公司',
    emailRequired: '郵箱*',
    phoneField: '電話',
    messageRequired: '留言*',
    productInterest: '感興趣產品',
    other: '其他',
    technicalWiki: '技術 Wiki',
    searchTechnicalTopics: '搜尋技術主題...',
    search: '搜尋',
    updated: '更新於',
    noWikiMatched: '未找到匹配內容。',
    backToWiki: '返回 Wiki',
    downloads: '下載中心',
    downloadsIntro: '按權限分類下載資料、手冊與技術文件。',
    publicDownloads: '公開下載',
    publicDownload: '公開',
    noPublicDownloads: '暫無公開下載',
    noPublicDownloadsHint: '後台可在站點設置中將文件設為公開。',
    loginRequiredDownloads: '登入後下載',
    loginRequired: '需要登入',
    loginToDownload: '登入後下載',
    noRestrictedDownloads: '暫無受限下載',
    noRestrictedDownloadsHint: '後台可在站點設置中將文件設為需登入。',
    download: '下載',
    accountLogin: '帳號登入',
    demoAccountHint: '受限下載演示帳號：',
    password: '密碼',
    about: '關於',
    capabilities: '能力',
    notFoundTitle: '404',
    notFoundDesc: '抱歉，您訪問的頁面不存在。',
    goHome: '回到首頁',
    social: '社媒',
    contact: '聯絡',
    language: '語言',
    langEN: 'EN',
    langZH: '简中',
    langZHTW: '繁中',
    categoryDefault: '通用',
    defaultBannerAlt: '預設 Banner',
    noBannerConfigured: '尚未配置 Banner'
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'frame-src': [
          "'self'",
          'https://www.youtube.com',
          'https://www.youtube-nocookie.com',
          'https://player.vimeo.com',
          'https://vimeo.com',
          'https:'
        ],
        'upgrade-insecure-requests': null
      }
    }
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '120mb' }));
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    setHeaders(res, filePath) {
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (lower.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (lower.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      }
      if (/\.(png|jpg|jpeg|webp|gif|svg|ico|mp4|webm|mov)$/.test(lower)) {
        res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      } else if (/\.(css|js)$/.test(lower)) {
        res.setHeader('Cache-Control', 'public, max-age=259200, stale-while-revalidate=86400');
      }
    }
  })
);

// Backward-compatible asset aliases for older cached pages/browsers.
app.get('/style.css', (req, res) => {
  res.redirect(302, '/css/style.css');
});
app.get('/main.js', (req, res) => {
  res.redirect(302, '/js/main.js');
});

app.use(
  session({
    name: 'sj_session',
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 3
    }
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter);
app.use((req, res, next) => {
  const accept = String(req.headers.accept || '');
  if (accept.includes('text/html')) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  next();
});
app.use('/admin', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});
app.use('/api', (req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

function escapeHtml(input = '') {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function markdownToHtml(markdown = '') {
  let html = escapeHtml(markdown);

  html = html.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  html = html.replace(/^(?:-\s.+(?:\n|$))+?/gm, (block) => {
    const items = block
      .trim()
      .split('\n')
      .map((line) => line.replace(/^-\s/, ''))
      .map((item) => `<li>${item}</li>`)
      .join('');
    return `<ul>${items}</ul>`;
  });

  html = html
    .split(/\n{2,}/)
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return '';
      if (/^<h[1-6]>/.test(trimmed) || /^<ul>/.test(trimmed)) return trimmed;
      return `<p>${trimmed.replaceAll('\n', '<br />')}</p>`;
    })
    .join('\n');

  return html;
}

function richContentToHtml(content = '') {
  const value = String(content || '').trim();
  if (!value) return '';

  // If content already looks like HTML (from WYSIWYG paste/edit), render directly.
  if (/<[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  // Fallback for existing markdown data.
  return markdownToHtml(value);
}

function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseYouTubeEmbed(url = '') {
  const src = String(url || '').trim();
  if (!src) return null;

  try {
    const u = new URL(src, 'http://localhost');
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      const v = u.searchParams.get('v');
      const shortId = u.hostname.includes('youtu.be') ? u.pathname.replace('/', '') : '';
      const embedPath = u.pathname.includes('/embed/') ? u.pathname.split('/embed/')[1] : '';
      const embedId = v || shortId || embedPath || '';
      if (embedId) {
        return {
          type: 'youtube',
          embedUrl: `https://www.youtube.com/embed/${embedId}`,
          thumbnail: `https://img.youtube.com/vi/${embedId}/hqdefault.jpg`
        };
      }
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoEmbed(url = '') {
  const src = String(url || '').trim();
  if (!src) return null;
  const match = src.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (!match) return null;
  const id = match[1];
  return {
    type: 'vimeo',
    embedUrl: `https://player.vimeo.com/video/${id}`
  };
}

function parseVideoSource(url = '') {
  const src = String(url || '').trim();
  if (!src) return { type: 'unknown', sourceUrl: '' };

  const yt = parseYouTubeEmbed(src);
  if (yt) return { ...yt, sourceUrl: src };

  const vm = parseVimeoEmbed(src);
  if (vm) return { ...vm, sourceUrl: src };

  const lower = src.toLowerCase();
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/.test(lower) || lower.startsWith('/uploads/')) {
    return { type: 'file', fileUrl: src, sourceUrl: src };
  }

  return { type: 'embed', embedUrl: src, sourceUrl: src };
}

function toLines(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseFontPx(value, min = 10, max = 72) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

function detectLang(req) {
  const qLang = String(req.query.lang || '').toLowerCase();
  if (SUPPORTED_LANGS.has(qLang)) return qLang;

  const sessionLang = String(req.session?.lang || '').toLowerCase();
  if (SUPPORTED_LANGS.has(sessionLang)) return sessionLang;

  const accept = String(req.headers['accept-language'] || '').toLowerCase();
  if (accept.includes('zh-tw') || accept.includes('zh-hk') || accept.includes('hant')) return 'zh-tw';
  if (accept.includes('zh')) return 'zh';
  return DEFAULT_LANG;
}

function localizedText(key, lang) {
  const table = I18N_TEXT[lang] || I18N_TEXT.en;
  return table[key] || I18N_TEXT.en[key] || key;
}

function pickLocalized(record, key, lang) {
  if (!record || typeof record !== 'object') return '';
  if (lang === 'zh') {
    const zhKey = `${key}Zh`;
    const value = record[zhKey];
    if (Array.isArray(value) && value.length) return value;
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  if (lang === 'zh-tw') {
    const twKey = `${key}ZhTw`;
    const tw = record[twKey];
    if (Array.isArray(tw) && tw.length) return tw;
    if (tw !== undefined && tw !== null && String(tw).trim() !== '') return tw;
    const zhKey = `${key}Zh`;
    const zh = record[zhKey];
    if (Array.isArray(zh) && zh.length) return zh;
    if (zh !== undefined && zh !== null && String(zh).trim() !== '') return zh;
  }
  return record[key];
}

async function readJsonObject(filePath, fallback = {}) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function readJsonArray(filePath) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveJson(filePath, data) {
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function readSeries() {
  const items = await readJsonArray(seriesPath);
  return items
    .map((item) => ({
      id: String(item.id || '').trim(),
      name: String(item.name || '').trim(),
      nameZh: String(item.nameZh || '').trim(),
      nameZhTw: String(item.nameZhTw || '').trim(),
      summary: String(item.summary || '').trim(),
      summaryZh: String(item.summaryZh || '').trim(),
      summaryZhTw: String(item.summaryZhTw || '').trim(),
      image: String(item.image || '/images/product-neutral.svg').trim(),
      sortOrder: Number(item.sortOrder || 999)
    }))
    .filter((x) => x.id && x.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function readProducts() {
  const items = await readJsonArray(productsPath);
  return items
    .map((item) => ({
      id: String(item.id || '').trim(),
      seriesId: String(item.seriesId || '').trim(),
      name: String(item.name || '').trim(),
      nameZh: String(item.nameZh || '').trim(),
      nameZhTw: String(item.nameZhTw || '').trim(),
      summary: String(item.summary || '').trim(),
      summaryZh: String(item.summaryZh || '').trim(),
      summaryZhTw: String(item.summaryZhTw || '').trim(),
      image: String(item.image || '/images/product-neutral.svg').trim(),
      detailMarkdown: String(item.detailMarkdown || '').trim(),
      detailMarkdownZh: String(item.detailMarkdownZh || '').trim(),
      detailMarkdownZhTw: String(item.detailMarkdownZhTw || '').trim(),
      sortOrder: Number(item.sortOrder || 999)
    }))
    .filter((x) => x.id && x.name)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

async function readWiki() {
  const items = await readJsonArray(wikiPath);
  return items
    .map((item) => ({
      id: String(item.id || '').trim(),
      slug: String(item.slug || '').trim(),
      title: String(item.title || '').trim(),
      titleZh: String(item.titleZh || '').trim(),
      titleZhTw: String(item.titleZhTw || '').trim(),
      excerpt: String(item.excerpt || '').trim(),
      excerptZh: String(item.excerptZh || '').trim(),
      excerptZhTw: String(item.excerptZhTw || '').trim(),
      category: String(item.category || 'General').trim(),
      categoryZh: String(item.categoryZh || '').trim(),
      categoryZhTw: String(item.categoryZhTw || '').trim(),
      updatedAt: String(item.updatedAt || '').trim(),
      contentMarkdown: String(item.contentMarkdown || '').trim(),
      contentMarkdownZh: String(item.contentMarkdownZh || '').trim(),
      contentMarkdownZhTw: String(item.contentMarkdownZhTw || '').trim()
    }))
    .filter((x) => x.id && x.slug && x.title);
}

async function readPageLayout() {
  const layout = await readJsonArray(pageLayoutPath);
  const map = new Map(layout.map((item) => [item.key, item]));
  return DEFAULT_SECTION_LAYOUT.map((base) => {
    const existing = map.get(base.key);
    return {
      key: base.key,
      label: base.label,
      enabled: existing ? Boolean(existing.enabled) : base.enabled,
      sortOrder: existing ? Number(existing.sortOrder || base.sortOrder) : base.sortOrder
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

async function readSiteSettings() {
  const fallback = {
    hero: {
      kicker: '', kickerZh: '', kickerZhTw: '',
      title: '', titleZh: '', titleZhTw: '',
      description: '', descriptionZh: '', descriptionZhTw: '',
      whyTitle: '', whyTitleZh: '', whyTitleZhTw: '',
      whyPoints: [], whyPointsZh: [], whyPointsZhTw: []
    },
    banners: [],
    video: { title: '', titleZh: '', titleZhTw: '', description: '', descriptionZh: '', descriptionZhTw: '', url: '' },
    videos: [],
    downloads: [
      {
        id: 'dl-brochure',
        title: 'Product Brochure',
        summary: 'Company and product overview brochure.',
        url: '/downloads/brochure',
        sortOrder: 1,
        enabled: true,
        requiresLogin: false
      }
    ],
    inquiry: {
      title: '', titleZh: '', titleZhTw: '',
      description: '', descriptionZh: '', descriptionZhTw: '',
      ctaText: 'Start Inquiry', ctaTextZh: '开始询盘', ctaTextZhTw: '開始詢盤'
    },
    contact: { whatsappNumber: '', email: '', inquiryLabel: 'Inquiry', inquiryLabelZh: '询盘', inquiryLabelZhTw: '詢盤' },
    social: {
      facebook: 'https://www.facebook.com',
      instagram: 'https://www.instagram.com',
      linkedin: 'https://www.linkedin.com',
      youtube: 'https://www.youtube.com',
      x: 'https://x.com'
    }
  };

  const settings = await readJsonObject(siteSettingsPath, fallback);
  settings.hero = settings.hero || fallback.hero;
  settings.video = settings.video || fallback.video;
  settings.videos = Array.isArray(settings.videos) ? settings.videos : [];
  settings.downloads = Array.isArray(settings.downloads) ? settings.downloads : fallback.downloads;
  settings.inquiry = settings.inquiry || fallback.inquiry;
  settings.contact = settings.contact || fallback.contact;
  settings.social = settings.social || fallback.social;
  settings.banners = Array.isArray(settings.banners) ? settings.banners : [];

  settings.banners = settings.banners
    .map((b) => ({
      id: String(b.id || '').trim(),
      title: String(b.title || '').trim(),
      titleZh: String(b.titleZh || '').trim(),
      titleZhTw: String(b.titleZhTw || '').trim(),
      description: String(b.description || '').trim(),
      descriptionZh: String(b.descriptionZh || '').trim(),
      descriptionZhTw: String(b.descriptionZhTw || '').trim(),
      image: String(b.image || '/images/product-neutral.svg').trim(),
      link: String(b.link || '/').trim(),
      titleFontSize: parseFontPx(b.titleFontSize, 14, 72),
      descFontSize: parseFontPx(b.descFontSize, 12, 56),
      sortOrder: Number(b.sortOrder || 999),
      enabled: Boolean(b.enabled)
    }))
    .filter((b) => b.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Backward compatibility: if old single video exists, seed videos list.
  if (!settings.videos.length && settings.video?.url) {
    settings.videos = [
      {
        id: 'video-legacy',
        title: settings.video.title || 'Corporate Video',
        description: settings.video.description || '',
        url: settings.video.url,
        coverImage: '/images/product-neutral.svg',
        sortOrder: 1,
        enabled: true
      }
    ];
  }

  settings.videos = settings.videos
    .map((v) => ({
      id: String(v.id || '').trim(),
      title: String(v.title || '').trim() || 'Video',
      titleZh: String(v.titleZh || '').trim(),
      titleZhTw: String(v.titleZhTw || '').trim(),
      description: String(v.description || '').trim(),
      descriptionZh: String(v.descriptionZh || '').trim(),
      descriptionZhTw: String(v.descriptionZhTw || '').trim(),
      url: String(v.url || '').trim(),
      coverImage: String(v.coverImage || '/images/product-neutral.svg').trim(),
      sortOrder: Number(v.sortOrder || 999),
      enabled: Boolean(v.enabled)
    }))
    .filter((v) => v.id && v.url)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  settings.downloads = settings.downloads
    .map((d) => ({
      id: String(d.id || '').trim(),
      title: String(d.title || '').trim() || 'Download',
      titleZh: String(d.titleZh || '').trim(),
      titleZhTw: String(d.titleZhTw || '').trim(),
      summary: String(d.summary || '').trim(),
      summaryZh: String(d.summaryZh || '').trim(),
      summaryZhTw: String(d.summaryZhTw || '').trim(),
      url: String(d.url || '').trim(),
      sortOrder: Number(d.sortOrder || 999),
      enabled: d.enabled !== false,
      requiresLogin: Boolean(d.requiresLogin)
    }))
    .filter((d) => d.id && d.url)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return settings;
}

function resolveDownloadLocalPath(downloadUrl = '') {
  const url = String(downloadUrl || '').trim();
  if (!url.startsWith('/uploads/') && !url.startsWith('/images/')) return null;
  const relative = url.replace(/^\/+/, '');
  const normalized = path.normalize(relative);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return null;
  return path.join(__dirname, 'public', normalized);
}

function resolvePublicDownloadUrl(item = {}) {
  const raw = String(item.url || '').trim();
  if (!raw) return '#';
  if (raw === '/downloads/brochure') return '/downloads/SJ-Brochure.txt';
  return raw;
}

function breadcrumbSchema(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`
    }))
  };
}

async function readInquiries() {
  const items = await readJsonArray(inquiriesPath);
  return items
    .map((item) => ({
      id: String(item.id || '').trim(),
      createdAt: String(item.createdAt || '').trim(),
      name: String(item.name || '').trim(),
      companyName: String(item.companyName || '').trim(),
      email: String(item.email || '').trim(),
      phone: String(item.phone || '').trim(),
      message: String(item.message || '').trim(),
      productId: String(item.productId || '').trim(),
      productName: String(item.productName || '').trim(),
      productInterest: String(item.productInterest || '').trim()
    }))
    .filter((x) => x.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

function renderPage(res, view, pageData = {}) {
  const lang = res.locals.lang || DEFAULT_LANG;
  const canonicalPath = pageData.canonical || '/';
  const canonical = lang === 'zh' ? `${canonicalPath}${canonicalPath.includes('?') ? '&' : '?'}lang=zh` : canonicalPath;
  const structuredData = Array.isArray(pageData.structuredData)
    ? pageData.structuredData
    : pageData.structuredData
      ? [pageData.structuredData]
      : [];
  res.render(view, {
    page: {
      title: pageData.title || company.name,
      description: pageData.description || company.intro,
      keywords: pageData.keywords || 'freeze dryer, lyophilizer, thermostatic bath, gmp freeze dryer',
      canonical,
      ogType: pageData.ogType || 'website',
      structuredData,
      ogImage: pageData.ogImage || '/images/product-neutral.svg',
      robots: pageData.robots || 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1',
      enableRichEditor: Boolean(pageData.enableRichEditor),
      language: lang,
      alternate: {
        en: canonicalPath,
        zh: `${canonicalPath}${canonicalPath.includes('?') ? '&' : '?'}lang=zh`,
        'zh-tw': `${canonicalPath}${canonicalPath.includes('?') ? '&' : '?'}lang=zh-tw`
      }
    },
    ...pageData
  });
}

app.use(async (req, res, next) => {
  const lang = detectLang(req);
  if (req.session) req.session.lang = lang;
  const withLang = (url = '/') => {
    const raw = String(url || '/').trim() || '/';
    const [pathname, hash = ''] = raw.split('#');
    const joiner = pathname.includes('?') ? '&' : '?';
    const nextUrl = `${pathname}${joiner}lang=${lang}`;
    return hash ? `${nextUrl}#${hash}` : nextUrl;
  };
  const t = (key) => localizedText(key, lang);
  const l = (record, key) => pickLocalized(record, key, lang);
  const switchLangUrl = (targetLang = 'en') => {
    const selected = SUPPORTED_LANGS.has(targetLang) ? targetLang : DEFAULT_LANG;
    const [base, hash = ''] = String(req.originalUrl || '/').split('#');
    const [pathname, qs = ''] = base.split('?');
    const params = new URLSearchParams(qs);
    params.set('lang', selected);
    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    return hash ? `${nextUrl}#${hash}` : nextUrl;
  };

  const settings = await readSiteSettings();
  res.locals.site = {
    url: siteUrl,
    assetVersion,
    company,
    contact: {
      whatsappNumber: settings.contact.whatsappNumber || process.env.WHATSAPP_NUMBER || '8613800000000',
      email: settings.contact.email || process.env.CONTACT_EMAIL || 'sales@example.com',
      inquiryLabel: pickLocalized(settings.contact, 'inquiryLabel', lang) || t('navInquiry')
    },
    googleAdsId: process.env.GOOGLE_ADS_ID || '',
    customHeadScript: process.env.CUSTOM_HEAD_SCRIPT || '',
    isLoggedIn: Boolean(req.session.user),
    social: settings.social
  };
  res.locals.lang = lang;
  res.locals.t = t;
  res.locals.l = l;
  res.locals.withLang = withLang;
  res.locals.switchLangUrl = switchLangUrl;
  res.locals.siteSettings = settings;
  res.locals.siteSettingsDisplay = {
    ...settings,
    hero: {
      ...settings.hero,
      kicker: pickLocalized(settings.hero, 'kicker', lang) || settings.hero.kicker,
      title: pickLocalized(settings.hero, 'title', lang) || settings.hero.title,
      description: pickLocalized(settings.hero, 'description', lang) || settings.hero.description,
      whyTitle: pickLocalized(settings.hero, 'whyTitle', lang) || settings.hero.whyTitle,
      whyPoints: pickLocalized(settings.hero, 'whyPoints', lang) || settings.hero.whyPoints || []
    },
    video: {
      ...settings.video,
      title: pickLocalized(settings.video, 'title', lang) || settings.video.title,
      description: pickLocalized(settings.video, 'description', lang) || settings.video.description
    },
    inquiry: {
      ...settings.inquiry,
      title: pickLocalized(settings.inquiry, 'title', lang) || settings.inquiry.title,
      description: pickLocalized(settings.inquiry, 'description', lang) || settings.inquiry.description,
      ctaText: pickLocalized(settings.inquiry, 'ctaText', lang) || settings.inquiry.ctaText
    },
    banners: (settings.banners || []).map((b) => ({
      ...b,
      title: pickLocalized(b, 'title', lang) || b.title,
      description: pickLocalized(b, 'description', lang) || b.description
    })),
    videos: (settings.videos || []).map((v) => ({
      ...v,
      title: pickLocalized(v, 'title', lang) || v.title,
      description: pickLocalized(v, 'description', lang) || v.description
    })),
    downloads: (settings.downloads || []).map((d) => ({
      ...d,
      title: pickLocalized(d, 'title', lang) || d.title,
      summary: pickLocalized(d, 'summary', lang) || d.summary
    }))
  };
  next();
});

app.get('/', async (req, res, next) => {
  try {
    const [seriesRaw, wikiRaw, pageLayout] = await Promise.all([readSeries(), readWiki(), readPageLayout()]);
    const series = seriesRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang)
    }));
    const wikiArticles = wikiRaw.map((item) => ({
      ...item,
      title: pickLocalized(item, 'title', res.locals.lang),
      excerpt: pickLocalized(item, 'excerpt', res.locals.lang),
      category: pickLocalized(item, 'category', res.locals.lang) || localizedText('categoryDefault', res.locals.lang)
    }));
    const enabledBanners = res.locals.siteSettingsDisplay.banners.filter((b) => b.enabled);
    const homeVideos = res.locals.siteSettingsDisplay.videos
      .filter((v) => v.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => {
        const parsed = parseVideoSource(v.url);
        return {
          ...v,
          title: pickLocalized(v, 'title', res.locals.lang),
          description: pickLocalized(v, 'description', res.locals.lang),
          ...parsed,
          previewImage: parsed.thumbnail || v.coverImage || '/images/product-neutral.svg'
        };
      });

    renderPage(res, 'home', {
      title: `${company.name} | Industrial Freeze Dryer Manufacturer`,
      description: 'Product series, corporate video, technical wiki and inquiry channels.',
      canonical: '/',
      ogType: 'website',
      series: series.slice(0, 8),
      wikiArticles: wikiArticles.slice(0, 3),
      pageLayout,
      banners: enabledBanners,
      homeVideos,
      mainVideo: homeVideos[0] || null,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: company.name,
          url: siteUrl,
          description: company.intro,
          sameAs: Object.values(res.locals.site.social || {}).filter(Boolean)
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: company.name,
          url: siteUrl
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/products', async (req, res, next) => {
  try {
    const [seriesRaw, products] = await Promise.all([readSeries(), readProducts()]);
    const series = seriesRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang)
    }));
    const productCountMap = Object.fromEntries(series.map((s) => [s.id, 0]));
    for (const product of products) {
      if (productCountMap[product.seriesId] !== undefined) productCountMap[product.seriesId] += 1;
    }

    renderPage(res, 'products', {
      title: `Product Series | ${company.name}`,
      description: 'Browse all product series and product families.',
      canonical: '/products',
      series,
      productCountMap,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Product Series | ${company.name}`,
          description: 'Browse all product series and product families.',
          url: `${siteUrl}/products`
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' }
        ])
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/series/:id', async (req, res, next) => {
  try {
    const [seriesRaw, productsRaw] = await Promise.all([readSeries(), readProducts()]);
    const series = seriesRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang)
    }));
    const products = productsRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang)
    }));
    const currentSeries = series.find((s) => s.id === req.params.id);
    if (!currentSeries) {
      return res.status(404).render('404', { page: { title: '404 Not Found' } });
    }

    const seriesProducts = products.filter((p) => p.seriesId === currentSeries.id);
    renderPage(res, 'series-detail', {
      title: `${currentSeries.name} | ${company.name}`,
      description: currentSeries.summary,
      canonical: `/series/${currentSeries.id}`,
      currentSeries,
      seriesProducts,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: currentSeries.name,
          description: currentSeries.summary,
          url: `${siteUrl}/series/${currentSeries.id}`
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: currentSeries.name, path: `/series/${currentSeries.id}` }
        ])
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/product/:id', async (req, res, next) => {
  try {
    const [seriesRaw, productsRaw] = await Promise.all([readSeries(), readProducts()]);
    const series = seriesRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang)
    }));
    const products = productsRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang),
      summary: pickLocalized(item, 'summary', res.locals.lang),
      detailMarkdown: pickLocalized(item, 'detailMarkdown', res.locals.lang) || item.detailMarkdown
    }));
    const product = products.find((p) => p.id === req.params.id);
    if (!product) {
      return res.status(404).render('404', { page: { title: '404 Not Found' } });
    }

    const currentSeries = series.find((s) => s.id === product.seriesId);
    const productUrl = `${siteUrl}/product/${product.id}`;
    const shareText = encodeURIComponent(`${product.name} - ${company.name}`);
    const shareUrl = encodeURIComponent(productUrl);
    const shareLinks = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
      x: `https://x.com/intent/tweet?url=${shareUrl}&text=${shareText}`,
      whatsapp: `https://wa.me/?text=${shareText}%20${shareUrl}`,
      instagram: res.locals.site.social.instagram || 'https://www.instagram.com'
    };

    renderPage(res, 'product-detail', {
      title: `${product.name} | ${company.name}`,
      description: product.summary,
      canonical: `/product/${product.id}`,
      ogType: 'product',
      ogImage: product.image,
      product,
      currentSeries,
      productDetailHtml: richContentToHtml(product.detailMarkdown),
      shareLinks,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.summary,
          image: [`${siteUrl}${product.image}`],
          brand: { '@type': 'Brand', name: company.name },
          url: productUrl,
          category: currentSeries?.name || 'Industrial Equipment'
        },
        {
          ...breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
            {
              name: currentSeries?.name || 'Series',
              path: `/series/${currentSeries?.id || product.seriesId || ''}`
            },
            { name: product.name, path: `/product/${product.id}` }
          ])
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/about', (req, res) => {
  renderPage(res, 'about', {
    title: `About Us | ${company.name}`,
    description: 'Company profile, capabilities, and manufacturing story.',
    canonical: '/about'
  });
});

app.get('/wiki', async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const wikiRaw = await readWiki();
    const wikiArticles = wikiRaw.map((item) => ({
      ...item,
      title: pickLocalized(item, 'title', res.locals.lang),
      excerpt: pickLocalized(item, 'excerpt', res.locals.lang),
      category: pickLocalized(item, 'category', res.locals.lang) || localizedText('categoryDefault', res.locals.lang)
    }));
    const filtered = q
      ? wikiArticles.filter((a) => `${a.title} ${a.excerpt} ${a.category}`.toLowerCase().includes(q))
      : wikiArticles;

    renderPage(res, 'wiki-list', {
      title: `Technical Wiki | ${company.name}`,
      description: 'Technical knowledge base for freeze drying and thermal control.',
      canonical: '/wiki',
      wikiArticles: filtered,
      query: q,
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: `Technical Wiki | ${company.name}`,
          description: 'Technical knowledge base for freeze drying and thermal control.',
          url: `${siteUrl}/wiki`
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Wiki', path: '/wiki' }
        ])
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/wiki/:slug', async (req, res, next) => {
  try {
    const wikiRaw = await readWiki();
    const wikiArticles = wikiRaw.map((item) => ({
      ...item,
      title: pickLocalized(item, 'title', res.locals.lang),
      excerpt: pickLocalized(item, 'excerpt', res.locals.lang),
      category: pickLocalized(item, 'category', res.locals.lang) || localizedText('categoryDefault', res.locals.lang),
      contentMarkdown: pickLocalized(item, 'contentMarkdown', res.locals.lang) || item.contentMarkdown
    }));
    const article = wikiArticles.find((item) => item.slug === req.params.slug);
    if (!article) {
      return res.status(404).render('404', { page: { title: '404 Not Found' } });
    }

    renderPage(res, 'wiki-detail', {
      title: `${article.title} | Technical Wiki`,
      description: article.excerpt,
      canonical: `/wiki/${article.slug}`,
      ogType: 'article',
      article,
      articleHtml: richContentToHtml(article.contentMarkdown),
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          dateModified: article.updatedAt,
          author: { '@type': 'Organization', name: company.name },
          publisher: { '@type': 'Organization', name: company.name },
          mainEntityOfPage: `${siteUrl}/wiki/${article.slug}`
        },
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Wiki', path: '/wiki' },
          { name: article.title, path: `/wiki/${article.slug}` }
        ])
      ]
    });
  } catch (error) {
    next(error);
  }
});

app.get('/inquiry', async (req, res, next) => {
  try {
    const productsRaw = await readProducts();
    const products = productsRaw.map((item) => ({
      ...item,
      name: pickLocalized(item, 'name', res.locals.lang)
    }));
    renderPage(res, 'inquiry', {
      title: `${res.locals.siteSettingsDisplay.inquiry.title} | ${company.name}`,
      description: res.locals.siteSettingsDisplay.inquiry.description,
      canonical: '/inquiry',
      products: products.slice(0, 80),
      selectedProductId: String(req.query.productId || ''),
      selectedProductName: String(req.query.productName || '')
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/inquiry', async (req, res, next) => {
  const { name, companyName, email, phone, message, productInterest, productId, productName } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, message: 'Name, email and message are required.' });
  }

  const inquiryId = `INQ-${Date.now()}`;
  try {
    const inquiries = await readInquiries();
    inquiries.push({
      id: inquiryId,
      createdAt: new Date().toISOString(),
      name: String(name || '').trim(),
      companyName: String(companyName || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      message: String(message || '').trim(),
      productId: String(productId || '').trim(),
      productName: String(productName || '').trim(),
      productInterest: String(productInterest || '').trim()
    });
    await saveJson(inquiriesPath, inquiries);
    return res.json({
      ok: true,
      inquiryId,
      received: { name, companyName, email, phone, message, productInterest, productId, productName }
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/login', (req, res) => {
  renderPage(res, 'login', {
    title: `Login | ${company.name}`,
    description: 'Account login for protected documents and downloads.',
    canonical: '/login',
    nextPath: req.query.next || '/downloads',
    robots: 'noindex,nofollow'
  });
});

app.post('/api/login', (req, res) => {
  const { username, password, nextPath } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    req.session.user = { username };
    return res.json({ ok: true, redirect: nextPath || '/downloads' });
  }
  return res.status(401).json({ ok: false, message: 'Invalid credentials.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sj_session');
    res.json({ ok: true });
  });
});

app.post('/api/admin/upload-image', requireAuth, async (req, res, next) => {
  try {
    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, message: 'Invalid image payload.' });
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ ok: false, message: 'Unsupported image format.' });
    }

    const mime = match[1].toLowerCase();
    const base64 = match[2];
    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    const ext = extMap[mime];
    if (!ext) {
      return res.status(400).json({ ok: false, message: 'Only png/jpg/webp/gif/svg are allowed.' });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ ok: false, message: 'Empty image data.' });
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ ok: false, message: 'Image too large. Max 10MB.' });
    }

    const safeBase = String(filename || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 40) || 'image';
    const outDir = path.join(__dirname, 'public', 'uploads');
    await mkdir(outDir, { recursive: true });
    const outName = `${Date.now()}-${safeBase}.${ext}`;
    await writeFile(path.join(outDir, outName), buffer);

    return res.json({ ok: true, url: `/uploads/${outName}` });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/upload-media', requireAuth, async (req, res, next) => {
  try {
    const { dataUrl, filename } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ ok: false, message: 'Invalid media payload.' });
    }

    const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ ok: false, message: 'Unsupported media format.' });
    }

    const mime = match[1].toLowerCase();
    const base64 = match[2];
    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogv',
      'video/quicktime': 'mov'
    };
    const ext = extMap[mime];
    if (!ext) {
      return res.status(400).json({ ok: false, message: 'Only common image/video formats are allowed.' });
    }

    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ ok: false, message: 'Empty media data.' });
    }
    if (buffer.length > 80 * 1024 * 1024) {
      return res.status(400).json({ ok: false, message: 'Media too large. Max 80MB.' });
    }

    const safeBase = String(filename || 'media')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 40) || 'media';
    const outDir = path.join(__dirname, 'public', 'uploads');
    await mkdir(outDir, { recursive: true });
    const outName = `${Date.now()}-${safeBase}.${ext}`;
    await writeFile(path.join(outDir, outName), buffer);
    return res.json({ ok: true, url: `/uploads/${outName}` });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/admin/import-image-url', requireAuth, async (req, res, next) => {
  try {
    const { url } = req.body || {};
    const src = String(url || '').trim();
    if (!/^https?:\/\//i.test(src)) {
      return res.status(400).json({ ok: false, message: 'Only http/https image URL is supported.' });
    }

    const response = await fetch(src);
    if (!response.ok) {
      return res.status(400).json({ ok: false, message: `Fetch failed (${response.status}).` });
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ ok: false, message: 'Target URL is not an image.' });
    }

    const extMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg'
    };
    const ext = extMap[contentType] || 'png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer.length) {
      return res.status(400).json({ ok: false, message: 'Empty image response.' });
    }
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ ok: false, message: 'Image too large. Max 10MB.' });
    }

    const outDir = path.join(__dirname, 'public', 'uploads');
    await mkdir(outDir, { recursive: true });
    const outName = `${Date.now()}-imported.${ext}`;
    await writeFile(path.join(outDir, outName), buffer);

    return res.json({ ok: true, url: `/uploads/${outName}` });
  } catch (error) {
    return next(error);
  }
});

app.get('/admin', requireAuth, (req, res) => {
  renderPage(res, 'admin-dashboard', {
    title: `Admin Center | ${company.name}`,
    description: 'Admin center',
    canonical: '/admin',
    robots: 'noindex,nofollow'
  });
});

app.get('/admin/inquiries', requireAuth, async (req, res, next) => {
  try {
    const inquiries = await readInquiries();
    renderPage(res, 'admin-inquiries', {
      title: `Inquiry Admin | ${company.name}`,
      description: 'Manage inquiries',
      canonical: '/admin/inquiries',
      inquiries,
      robots: 'noindex,nofollow'
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin/series', requireAuth, async (req, res, next) => {
  try {
    const series = await readSeries();
    renderPage(res, 'admin-series', {
      title: `Series Admin | ${company.name}`,
      description: 'Manage product series',
      canonical: '/admin/series',
      series,
      status: req.query.status || '',
      robots: 'noindex,nofollow'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/series/create', requireAuth, async (req, res, next) => {
  try {
    const series = await readSeries();
    series.push({
      id: `series-${Date.now()}`,
      name: String(req.body.name || '').trim() || 'New Series',
      nameZh: String(req.body.nameZh || '').trim(),
      nameZhTw: String(req.body.nameZhTw || '').trim(),
      summary: String(req.body.summary || '').trim(),
      summaryZh: String(req.body.summaryZh || '').trim(),
      summaryZhTw: String(req.body.summaryZhTw || '').trim(),
      image: String(req.body.image || '/images/product-neutral.svg').trim(),
      sortOrder: Number(req.body.sortOrder || series.length + 1)
    });
    await saveJson(seriesPath, series.sort((a, b) => a.sortOrder - b.sortOrder));
    res.redirect('/admin/series?status=created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/series/:id/update', requireAuth, async (req, res, next) => {
  try {
    const series = await readSeries();
    const target = series.find((s) => s.id === req.params.id);
    if (!target) return res.redirect('/admin/series?status=notfound');

    target.name = String(req.body.name || '').trim() || target.name;
    target.nameZh = String(req.body.nameZh || '').trim();
    target.nameZhTw = String(req.body.nameZhTw || '').trim();
    target.summary = String(req.body.summary || '').trim();
    target.summaryZh = String(req.body.summaryZh || '').trim();
    target.summaryZhTw = String(req.body.summaryZhTw || '').trim();
    target.image = String(req.body.image || '/images/product-neutral.svg').trim();
    target.sortOrder = Number(req.body.sortOrder || target.sortOrder);

    await saveJson(seriesPath, series.sort((a, b) => a.sortOrder - b.sortOrder));
    res.redirect('/admin/series?status=updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/series/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const products = await readProducts();
    if (products.some((p) => p.seriesId === req.params.id)) {
      return res.redirect('/admin/series?status=used_by_products');
    }

    const series = await readSeries();
    await saveJson(seriesPath, series.filter((s) => s.id !== req.params.id));
    res.redirect('/admin/series?status=deleted');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/products', requireAuth, async (req, res, next) => {
  try {
    const [series, products] = await Promise.all([readSeries(), readProducts()]);
    renderPage(res, 'admin-products', {
      title: `Product Admin | ${company.name}`,
      description: 'Manage products',
      canonical: '/admin/products',
      series,
      products,
      status: req.query.status || '',
      robots: 'noindex,nofollow',
      enableRichEditor: true
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/products/create', requireAuth, async (req, res, next) => {
  try {
    const products = await readProducts();
    products.push({
      id: `prod-${Date.now()}`,
      seriesId: String(req.body.seriesId || '').trim(),
      name: String(req.body.name || '').trim() || 'New Product',
      nameZh: String(req.body.nameZh || '').trim(),
      nameZhTw: String(req.body.nameZhTw || '').trim(),
      summary: String(req.body.summary || '').trim(),
      summaryZh: String(req.body.summaryZh || '').trim(),
      summaryZhTw: String(req.body.summaryZhTw || '').trim(),
      image: String(req.body.image || '/images/product-neutral.svg').trim(),
      detailMarkdown: String(req.body.detailMarkdown || '').trim(),
      detailMarkdownZh: String(req.body.detailMarkdownZh || '').trim(),
      detailMarkdownZhTw: String(req.body.detailMarkdownZhTw || '').trim(),
      sortOrder: Number(req.body.sortOrder || products.length + 1)
    });
    await saveJson(productsPath, products.sort((a, b) => a.sortOrder - b.sortOrder));
    res.redirect('/admin/products?status=created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/products/:id/update', requireAuth, async (req, res, next) => {
  try {
    const products = await readProducts();
    const target = products.find((p) => p.id === req.params.id);
    if (!target) return res.redirect('/admin/products?status=notfound');

    target.seriesId = String(req.body.seriesId || '').trim();
    target.name = String(req.body.name || '').trim() || target.name;
    target.nameZh = String(req.body.nameZh || '').trim();
    target.nameZhTw = String(req.body.nameZhTw || '').trim();
    target.summary = String(req.body.summary || '').trim();
    target.summaryZh = String(req.body.summaryZh || '').trim();
    target.summaryZhTw = String(req.body.summaryZhTw || '').trim();
    target.image = String(req.body.image || '/images/product-neutral.svg').trim();
    target.detailMarkdown = String(req.body.detailMarkdown || '').trim();
    target.detailMarkdownZh = String(req.body.detailMarkdownZh || '').trim();
    target.detailMarkdownZhTw = String(req.body.detailMarkdownZhTw || '').trim();
    target.sortOrder = Number(req.body.sortOrder || target.sortOrder);

    await saveJson(productsPath, products.sort((a, b) => a.sortOrder - b.sortOrder));
    res.redirect('/admin/products?status=updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/products/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const products = await readProducts();
    await saveJson(productsPath, products.filter((p) => p.id !== req.params.id));
    res.redirect('/admin/products?status=deleted');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/wiki', requireAuth, async (req, res, next) => {
  try {
    const wikiArticles = await readWiki();
    renderPage(res, 'admin-wiki', {
      title: `Wiki Admin | ${company.name}`,
      description: 'Manage wiki',
      canonical: '/admin/wiki',
      wikiArticles,
      status: req.query.status || '',
      robots: 'noindex,nofollow',
      enableRichEditor: true
    });
  } catch (error) {
    next(error);
  }
});

app.get('/admin/videos', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    renderPage(res, 'admin-videos', {
      title: `Video Admin | ${company.name}`,
      description: 'Manage videos',
      canonical: '/admin/videos',
      videos: settings.videos || [],
      status: req.query.status || '',
      robots: 'noindex,nofollow'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/wiki/create', requireAuth, async (req, res, next) => {
  try {
    const wikiArticles = await readWiki();
    const title = String(req.body.title || '').trim() || 'New Wiki';
    const slug = slugify(String(req.body.slug || '').trim() || title) || `wiki-${Date.now()}`;
    wikiArticles.push({
      id: `wiki-${Date.now()}`,
      slug,
      title,
      titleZh: String(req.body.titleZh || '').trim(),
      titleZhTw: String(req.body.titleZhTw || '').trim(),
      excerpt: String(req.body.excerpt || '').trim(),
      excerptZh: String(req.body.excerptZh || '').trim(),
      excerptZhTw: String(req.body.excerptZhTw || '').trim(),
      category: String(req.body.category || 'General').trim(),
      categoryZh: String(req.body.categoryZh || '').trim(),
      categoryZhTw: String(req.body.categoryZhTw || '').trim(),
      updatedAt: new Date().toISOString().slice(0, 10),
      contentMarkdown: String(req.body.contentMarkdown || '').trim(),
      contentMarkdownZh: String(req.body.contentMarkdownZh || '').trim(),
      contentMarkdownZhTw: String(req.body.contentMarkdownZhTw || '').trim()
    });
    await saveJson(wikiPath, wikiArticles);
    res.redirect('/admin/wiki?status=created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/wiki/:id/update', requireAuth, async (req, res, next) => {
  try {
    const wikiArticles = await readWiki();
    const target = wikiArticles.find((a) => a.id === req.params.id);
    if (!target) return res.redirect('/admin/wiki?status=notfound');

    target.title = String(req.body.title || '').trim() || target.title;
    target.titleZh = String(req.body.titleZh || '').trim();
    target.titleZhTw = String(req.body.titleZhTw || '').trim();
    target.slug = slugify(String(req.body.slug || '').trim() || target.title) || target.slug;
    target.excerpt = String(req.body.excerpt || '').trim();
    target.excerptZh = String(req.body.excerptZh || '').trim();
    target.excerptZhTw = String(req.body.excerptZhTw || '').trim();
    target.category = String(req.body.category || 'General').trim();
    target.categoryZh = String(req.body.categoryZh || '').trim();
    target.categoryZhTw = String(req.body.categoryZhTw || '').trim();
    target.contentMarkdown = String(req.body.contentMarkdown || '').trim();
    target.contentMarkdownZh = String(req.body.contentMarkdownZh || '').trim();
    target.contentMarkdownZhTw = String(req.body.contentMarkdownZhTw || '').trim();
    target.updatedAt = new Date().toISOString().slice(0, 10);

    await saveJson(wikiPath, wikiArticles);
    res.redirect('/admin/wiki?status=updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/wiki/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const wikiArticles = await readWiki();
    await saveJson(wikiPath, wikiArticles.filter((a) => a.id !== req.params.id));
    res.redirect('/admin/wiki?status=deleted');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/site', requireAuth, (req, res) => {
  renderPage(res, 'admin-site', {
    title: `Site Settings | ${company.name}`,
    description: 'Manage banner/video/contact/inquiry',
    canonical: '/admin/site',
    status: req.query.status || '',
    robots: 'noindex,nofollow'
  });
});

app.post('/api/admin/site/update-core', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.hero.kicker = String(req.body.heroKicker || '').trim();
    settings.hero.kickerZh = String(req.body.heroKickerZh || '').trim();
    settings.hero.kickerZhTw = String(req.body.heroKickerZhTw || '').trim();
    settings.hero.title = String(req.body.heroTitle || '').trim();
    settings.hero.titleZh = String(req.body.heroTitleZh || '').trim();
    settings.hero.titleZhTw = String(req.body.heroTitleZhTw || '').trim();
    settings.hero.description = String(req.body.heroDescription || '').trim();
    settings.hero.descriptionZh = String(req.body.heroDescriptionZh || '').trim();
    settings.hero.descriptionZhTw = String(req.body.heroDescriptionZhTw || '').trim();
    settings.hero.whyTitle = String(req.body.heroWhyTitle || '').trim();
    settings.hero.whyTitleZh = String(req.body.heroWhyTitleZh || '').trim();
    settings.hero.whyTitleZhTw = String(req.body.heroWhyTitleZhTw || '').trim();
    settings.hero.whyPoints = toLines(req.body.heroWhyPoints || '').slice(0, 8);
    settings.hero.whyPointsZh = toLines(req.body.heroWhyPointsZh || '').slice(0, 8);
    settings.hero.whyPointsZhTw = toLines(req.body.heroWhyPointsZhTw || '').slice(0, 8);

    settings.video.title = String(req.body.videoTitle || '').trim();
    settings.video.titleZh = String(req.body.videoTitleZh || '').trim();
    settings.video.titleZhTw = String(req.body.videoTitleZhTw || '').trim();
    settings.video.description = String(req.body.videoDescription || '').trim();
    settings.video.descriptionZh = String(req.body.videoDescriptionZh || '').trim();
    settings.video.descriptionZhTw = String(req.body.videoDescriptionZhTw || '').trim();
    if (req.body.videoUrl !== undefined) {
      settings.video.url = String(req.body.videoUrl || '').trim();
    }

    settings.inquiry.title = String(req.body.inquiryTitle || '').trim();
    settings.inquiry.titleZh = String(req.body.inquiryTitleZh || '').trim();
    settings.inquiry.titleZhTw = String(req.body.inquiryTitleZhTw || '').trim();
    settings.inquiry.description = String(req.body.inquiryDescription || '').trim();
    settings.inquiry.descriptionZh = String(req.body.inquiryDescriptionZh || '').trim();
    settings.inquiry.descriptionZhTw = String(req.body.inquiryDescriptionZhTw || '').trim();
    settings.inquiry.ctaText = String(req.body.inquiryCtaText || '').trim() || 'Start Inquiry';
    settings.inquiry.ctaTextZh = String(req.body.inquiryCtaTextZh || '').trim() || '开始询盘';
    settings.inquiry.ctaTextZhTw = String(req.body.inquiryCtaTextZhTw || '').trim() || '開始詢盤';

    settings.contact.whatsappNumber = String(req.body.whatsappNumber || '').trim();
    settings.contact.email = String(req.body.contactEmail || '').trim();
    settings.contact.inquiryLabel = String(req.body.inquiryLabel || '').trim() || 'Inquiry';
    settings.contact.inquiryLabelZh = String(req.body.inquiryLabelZh || '').trim() || '询盘';
    settings.contact.inquiryLabelZhTw = String(req.body.inquiryLabelZhTw || '').trim() || '詢盤';
    settings.social.facebook = String(req.body.socialFacebook || '').trim();
    settings.social.instagram = String(req.body.socialInstagram || '').trim();
    settings.social.linkedin = String(req.body.socialLinkedin || '').trim();
    settings.social.youtube = String(req.body.socialYoutube || '').trim();
    settings.social.x = String(req.body.socialX || '').trim();

    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=core_updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/video/create', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.videos.push({
      id: `video-${Date.now()}`,
      title: String(req.body.title || '').trim() || 'Video',
      titleZh: String(req.body.titleZh || '').trim(),
      titleZhTw: String(req.body.titleZhTw || '').trim(),
      description: String(req.body.description || '').trim(),
      descriptionZh: String(req.body.descriptionZh || '').trim(),
      descriptionZhTw: String(req.body.descriptionZhTw || '').trim(),
      url: String(req.body.url || '').trim(),
      coverImage: String(req.body.coverImage || '/images/product-neutral.svg').trim(),
      sortOrder: Number(req.body.sortOrder || settings.videos.length + 1),
      enabled: true
    });
    settings.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=video_created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/video/:id/update', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    const video = settings.videos.find((v) => v.id === req.params.id);
    if (!video) return res.redirect('/admin/site?status=video_notfound');

    video.title = String(req.body.title || '').trim() || video.title;
    video.titleZh = String(req.body.titleZh || '').trim();
    video.titleZhTw = String(req.body.titleZhTw || '').trim();
    video.description = String(req.body.description || '').trim();
    video.descriptionZh = String(req.body.descriptionZh || '').trim();
    video.descriptionZhTw = String(req.body.descriptionZhTw || '').trim();
    video.url = String(req.body.url || '').trim();
    video.coverImage = String(req.body.coverImage || '/images/product-neutral.svg').trim();
    video.sortOrder = Number(req.body.sortOrder || video.sortOrder);
    video.enabled = req.body.enabled === 'on';

    settings.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=video_updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/video/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.videos = settings.videos.filter((v) => v.id !== req.params.id);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=video_deleted');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/videos/create', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.videos.push({
      id: `video-${Date.now()}`,
      title: String(req.body.title || '').trim() || 'Video',
      titleZh: String(req.body.titleZh || '').trim(),
      titleZhTw: String(req.body.titleZhTw || '').trim(),
      description: String(req.body.description || '').trim(),
      descriptionZh: String(req.body.descriptionZh || '').trim(),
      descriptionZhTw: String(req.body.descriptionZhTw || '').trim(),
      url: String(req.body.url || '').trim(),
      coverImage: String(req.body.coverImage || '/images/product-neutral.svg').trim(),
      sortOrder: Number(req.body.sortOrder || settings.videos.length + 1),
      enabled: true
    });
    settings.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/videos?status=created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/videos/:id/update', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    const video = settings.videos.find((v) => v.id === req.params.id);
    if (!video) return res.redirect('/admin/videos?status=notfound');

    video.title = String(req.body.title || '').trim() || video.title;
    video.titleZh = String(req.body.titleZh || '').trim();
    video.titleZhTw = String(req.body.titleZhTw || '').trim();
    video.description = String(req.body.description || '').trim();
    video.descriptionZh = String(req.body.descriptionZh || '').trim();
    video.descriptionZhTw = String(req.body.descriptionZhTw || '').trim();
    video.url = String(req.body.url || '').trim();
    video.coverImage = String(req.body.coverImage || '/images/product-neutral.svg').trim();
    video.sortOrder = Number(req.body.sortOrder || video.sortOrder);
    video.enabled = req.body.enabled === 'on';

    settings.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/videos?status=updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/videos/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.videos = settings.videos.filter((v) => v.id !== req.params.id);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/videos?status=deleted');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/banner/create', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.banners.push({
      id: `bnr-${Date.now()}`,
      title: String(req.body.title || '').trim() || 'New Banner',
      titleZh: String(req.body.titleZh || '').trim(),
      titleZhTw: String(req.body.titleZhTw || '').trim(),
      description: String(req.body.description || '').trim(),
      descriptionZh: String(req.body.descriptionZh || '').trim(),
      descriptionZhTw: String(req.body.descriptionZhTw || '').trim(),
      image: String(req.body.image || '/images/product-neutral.svg').trim(),
      link: String(req.body.link || '/').trim(),
      titleFontSize: parseFontPx(req.body.titleFontSize, 14, 72),
      descFontSize: parseFontPx(req.body.descFontSize, 12, 56),
      sortOrder: Number(req.body.sortOrder || settings.banners.length + 1),
      enabled: true
    });
    settings.banners.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=banner_created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/banner/:id/update', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    const banner = settings.banners.find((b) => b.id === req.params.id);
    if (!banner) return res.redirect('/admin/site?status=banner_notfound');

    banner.title = String(req.body.title || '').trim() || banner.title;
    banner.titleZh = String(req.body.titleZh || '').trim();
    banner.titleZhTw = String(req.body.titleZhTw || '').trim();
    banner.description = String(req.body.description || '').trim();
    banner.descriptionZh = String(req.body.descriptionZh || '').trim();
    banner.descriptionZhTw = String(req.body.descriptionZhTw || '').trim();
    banner.image = String(req.body.image || '/images/product-neutral.svg').trim();
    banner.link = String(req.body.link || '/').trim();
    banner.titleFontSize = parseFontPx(req.body.titleFontSize, 14, 72);
    banner.descFontSize = parseFontPx(req.body.descFontSize, 12, 56);
    banner.sortOrder = Number(req.body.sortOrder || banner.sortOrder);
    banner.enabled = req.body.enabled === 'on';

    settings.banners.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=banner_updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/banner/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.banners = settings.banners.filter((b) => b.id !== req.params.id);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=banner_deleted');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/download/create', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.downloads.push({
      id: `dl-${Date.now()}`,
      title: String(req.body.title || '').trim() || 'Download',
      titleZh: String(req.body.titleZh || '').trim(),
      titleZhTw: String(req.body.titleZhTw || '').trim(),
      summary: String(req.body.summary || '').trim(),
      summaryZh: String(req.body.summaryZh || '').trim(),
      summaryZhTw: String(req.body.summaryZhTw || '').trim(),
      url: String(req.body.url || '').trim(),
      sortOrder: Number(req.body.sortOrder || settings.downloads.length + 1),
      enabled: true,
      requiresLogin: false
    });
    settings.downloads.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=download_created');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/download/:id/update', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    const download = settings.downloads.find((d) => d.id === req.params.id);
    if (!download) return res.redirect('/admin/site?status=download_notfound');

    download.title = String(req.body.title || '').trim() || download.title;
    download.titleZh = String(req.body.titleZh || '').trim();
    download.titleZhTw = String(req.body.titleZhTw || '').trim();
    download.summary = String(req.body.summary || '').trim();
    download.summaryZh = String(req.body.summaryZh || '').trim();
    download.summaryZhTw = String(req.body.summaryZhTw || '').trim();
    download.url = String(req.body.url || '').trim();
    download.sortOrder = Number(req.body.sortOrder || download.sortOrder);
    download.enabled = req.body.enabled === 'on';
    download.requiresLogin = false;

    settings.downloads.sort((a, b) => a.sortOrder - b.sortOrder);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=download_updated');
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/site/download/:id/delete', requireAuth, async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    settings.downloads = settings.downloads.filter((d) => d.id !== req.params.id);
    await saveJson(siteSettingsPath, settings);
    res.redirect('/admin/site?status=download_deleted');
  } catch (error) {
    next(error);
  }
});

app.get('/admin/layout', requireAuth, async (req, res, next) => {
  try {
    const pageLayout = await readPageLayout();
    renderPage(res, 'admin-layout', {
      title: `Layout Admin | ${company.name}`,
      description: 'Manage homepage section layout',
      canonical: '/admin/layout',
      pageLayout,
      status: req.query.status || '',
      robots: 'noindex,nofollow'
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/layout/update', requireAuth, async (req, res, next) => {
  try {
    const current = await readPageLayout();
    const updated = current.map((section) => ({
      ...section,
      enabled: req.body[`enabled_${section.key}`] === 'on',
      sortOrder: Number(req.body[`sortOrder_${section.key}`] || section.sortOrder)
    }));
    await saveJson(pageLayoutPath, updated.sort((a, b) => a.sortOrder - b.sortOrder));
    res.redirect('/admin/layout?status=updated');
  } catch (error) {
    next(error);
  }
});

app.get('/downloads', (req, res) => {
  const downloads = (res.locals.siteSettingsDisplay.downloads || [])
    .filter((d) => d.enabled)
    .map((d) => ({ ...d, publicUrl: resolvePublicDownloadUrl(d) }));
  renderPage(res, 'downloads', {
    title: `Downloads | ${company.name}`,
    description: 'Brochures, product specs, and manuals.',
    canonical: '/downloads',
    downloads
  });
});

app.get('/downloads/file/:id', async (req, res, next) => {
  try {
    const settings = await readSiteSettings();
    const item = settings.downloads.find((d) => d.id === req.params.id && d.enabled);
    if (!item) {
      res.status(404);
      return renderPage(res, '404', {
        title: `Page Not Found | ${company.name}`,
        description: 'Requested download was not found.',
        canonical: '/404',
        robots: 'noindex,nofollow'
      });
    }
    if (item.url === '/downloads/brochure') {
      const brochurePath = path.join(__dirname, 'protected', 'sample-brochure.txt');
      return res.download(brochurePath, 'SJ-Brochure.txt');
    }

    const isHttp = /^https?:\/\//i.test(item.url);
    if (isHttp) return res.redirect(item.url);

    const localPath = resolveDownloadLocalPath(item.url);
    if (localPath) {
      const fileName = path.basename(localPath);
      return res.download(localPath, fileName);
    }

    if (item.url.startsWith('/downloads/') && item.url !== `/downloads/file/${item.id}`) {
      return res.redirect(item.url);
    }

    return res.redirect(item.url || '/downloads');
  } catch (error) {
    next(error);
  }
});

app.get('/downloads/brochure', (req, res) => {
  const brochurePath = path.join(__dirname, 'protected', 'sample-brochure.txt');
  res.download(brochurePath, 'SJ-Brochure.txt');
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /login\nSitemap: ${siteUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const [series, products, wikiArticles] = await Promise.all([readSeries(), readProducts(), readWiki()]);
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      '/',
      '/products',
      '/about',
      '/wiki',
      '/inquiry',
      '/downloads',
      ...series.map((s) => `/series/${s.id}`),
      ...products.map((p) => `/product/${p.id}`),
      ...wikiArticles.map((a) => `/wiki/${a.slug}`)
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map(
        (url) =>
          `<url><loc>${siteUrl}${url}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${url === '/' ? '1.0' : '0.8'}</priority></url>`
      )
      .join('\n')}\n</urlset>`;

    res.type('application/xml');
    res.send(sitemap);
  } catch (error) {
    next(error);
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/debug/assets', (req, res) => {
  res.type('text/html');
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Asset Debug</title></head>
<body style="font-family:Arial,sans-serif;padding:16px">
  <h2>Asset Debug</h2>
  <p>Open DevTools Network and verify MIME type + status for these:</p>
  <ul>
    <li><a href="/css/style.css" target="_blank">/css/style.css</a></li>
    <li><a href="/js/main.js" target="_blank">/js/main.js</a></li>
    <li><a href="/style.css" target="_blank">/style.css (alias)</a></li>
    <li><a href="/main.js" target="_blank">/main.js (alias)</a></li>
  </ul>
  <p>Expected content types:</p>
  <ul>
    <li>CSS: text/css</li>
    <li>JS: application/javascript (or text/javascript)</li>
  </ul>
  <h3>Auto Check</h3>
  <pre id="out">checking...</pre>
  <script>
    (async function () {
      const targets = ['/css/style.css', '/style.css', '/js/main.js', '/main.js'];
      const lines = [];
      for (const url of targets) {
        try {
          const r = await fetch(url, { method: 'GET', cache: 'no-store' });
          lines.push(url + ' -> ' + r.status + ' | ' + (r.headers.get('content-type') || 'n/a'));
        } catch (e) {
          lines.push(url + ' -> ERROR: ' + (e && e.message ? e.message : e));
        }
      }
      document.getElementById('out').textContent = lines.join('\\n');
    })();
  </script>
</body></html>`);
});

app.use((req, res) => {
  res.status(404).render('404', {
    page: {
      title: '404 Not Found',
      description: 'Page not found',
      canonical: '/404'
    }
  });
});

app.use((error, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Site is running at http://localhost:${port}`);
});
