# Industrial Showcase Website (CMS-style, Docker Ready)

This project now supports a CMS-like workflow:

- Product **Series** management
- Products inside each series
- Product detail editing with **Markdown**
- Multi-banner carousel (admin editable)
- Video section editable
- Wiki CRUD (admin editable, Markdown content)
- Inquiry page copy editable
- Floating contact panel editable (WhatsApp / Email / label)
- SEO basics (meta, canonical, OG, robots, sitemap)
- Account login + protected downloads

## Local Run

```bash
cd /Users/elmerhan/Documents/website_v1
cp .env.example .env
npm install
npm run dev
```

Open: http://localhost:3000

Demo login:
- demo@sj.com
- 12345678

## Docker Run

```bash
cp .env.example .env
docker compose up --build
```

## Admin Pages

After login:

- `/admin` 管理中心
- `/admin/series` 系列管理
- `/admin/products` 产品管理（Markdown详情）
- `/admin/wiki` Wiki管理（Markdown）
- `/admin/videos` 视频管理（多视频、排序、启用、缩略预览）
- `/admin/inquiries` 询盘管理（可识别产品来源）
- `/admin/site` 站点设置（Banner/视频/Inquiry/悬浮联系方式/社媒链接）
- 视频管理支持 YouTube/Vimeo/直链视频（含本地上传）与首页缩略预览弹窗播放，按排序决定首页主视频
- `/admin/layout` 首页区块开关与排序

Admin enhancements:
- Collapse UI for large lists (hundreds of records)
- Keyword search/filter inside admin lists
- Image upload and clipboard paste (Cmd+V / Ctrl+V) to auto-fill image URL
- Rich editor (Docmost/Notion paste-friendly): tables/images/videos + fullscreen editing

## Data Files

- `/Users/elmerhan/Documents/website_v1/src/data/series.json`
- `/Users/elmerhan/Documents/website_v1/src/data/products.json`
- `/Users/elmerhan/Documents/website_v1/src/data/wiki.json`
- `/Users/elmerhan/Documents/website_v1/src/data/site-settings.json`
- `/Users/elmerhan/Documents/website_v1/src/data/page-layout.json`
- `/Users/elmerhan/Documents/website_v1/src/data/inquiries.json`

## Production Note

Current auth is demo mode. For production, replace with database users, hashed passwords, CSRF protection and secure HTTPS cookies.
