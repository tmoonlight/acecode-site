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

ACECode 的 `package` 工作流在 Release 发布成功后自动更新本站清单，
通过仓库 push 触发 `Deploy Pages`，并检查 CDN 上的实际清单。
正常发布不需要手动刷新。维护重试见 [部署说明](docs/deployment.md)。
