# GitHub Pages 与 CDN 部署

## 范围与责任

产品 `/acemodel/`、下载 `/download/`、帮助 `/help/` 和 `/acecode/`、
价格 `/key-usage/pricing/`、接入指南 `/key-usage/guide/` 由本仓库发布。
导航中的用户中心、登录、充值等动作继续进入 `https://acecode.cc/customerv2`。
模型 API 接入地址继续使用 `https://acecode.cc/aceapi/v1`。

网页、脚本、样式、字体、截图和宣传片都通过 Bunny 访问。
GitHub Pages 源地址为 `https://tmoonlight.github.io/acecode-site`。
Bunny 默认源站使用此地址；`/v*/...` 文件请求覆盖到 GitHub Releases，
`/api/key-usage/pricing` 只回源公开模型价格接口。账户 API 不进入缓存配置。

## 发布与数据

下载清单在构建时由公开 GitHub Releases 资产生成，保留精确资产名、
版本、大小与 GitHub 提供的 SHA-256；开发调试文件不在下载 UI 中展示。
不再依赖本机下载别名，也不探测不存在的文件。
CDN 价格页使用当前公开接口；直接访问 GitHub Pages 时使用构建时快照。
HTML/版本清单使用短缓存，安装包路径带固定版本并使用长缓存。

每次更新网站或发布安装包后运行 Pages 工作流。工作流支持外部
`repository_dispatch` 的 `release-published` 事件，以便现有发布流水线调用。

## 验收

- 类型检查、生产构建、全部 HTML 本地资源引用和公开导航检查。
- GitHub Pages 部署完成后核对各公开页面和静态资源。
- CDN 逐页 HTTP、缓存和完整安装包哈希检查。
- 浏览器检查价格筛选、语言、指南标签页、下载清单、宣传片和桌面/手机布局。
- 核对用户中心链接继续使用原站；不复制账户后台、数据或凭据。

## 回退

网站可重新部署本仓库前一提交。Bunny 可恢复变更前的源站与边缘规则，
安装包仍在原 GitHub Release 中。原网站服务和本机站点保持可用。
