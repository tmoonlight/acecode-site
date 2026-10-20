# ACECode 公开网站

产品首页、模型价格、接入指南、下载页和两套帮助文档。

- 统一入口：https://acecodedownload.b-cdn.net/
- 用户中心：https://acecode.cc/customerv2
- 安装包来源：https://github.com/tmoonlight/acecode/releases

保留既有页面设计。账户、支付和管理服务不在此仓库。
GitHub Pages 存储公开网站资源，Bunny 按路径回源到 Pages、GitHub Releases
及既有的公开模型价格接口。

## 构建

```sh
python scripts/sync_catalog.py
npm ci --prefix frontend
npm run typecheck --prefix frontend
npm run build --prefix frontend
python scripts/assemble.py
python scripts/check_site.py
```

部署由 GitHub Actions 的 `Deploy Pages` 工作流完成。发布新版本后可通过
`gh workflow run pages.yml --repo tmoonlight/acecode-site` 同步最新版本并部署。
