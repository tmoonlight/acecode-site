# GitHub Pages 与 CDN 部署

## 范围与责任

产品 `/acemodel/`、下载 `/download/`、帮助 `/help/` 和 `/acecode/`、
价格 `/key-usage/pricing/`、接入指南 `/key-usage/guide/` 由本仓库发布。
导航中的用户中心、登录、充值等动作继续进入 `https://acecode.cc/customerv2`。
模型 API 接入地址继续使用 `https://acecode.cc/aceapi/v1`。

网页、脚本、样式、字体、截图和宣传片都通过 Bunny 访问。
GitHub Pages 项目继承账号已有博客域名，源地址为
`https://blog.bigjuan.xyz/acecode-site`，不改变博客根目录。
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
安装包仍在原 GitHub Release 中。旧站页面和本机页面的变更前副本均已备份。

## 2026-10-20 部署记录

- GitHub Actions 构建与 Pages 部署成功，站点源码提交为 `bd847a2`。
- 106 个生成页面、11,341 处本地引用检查通过；104 个发布版本、
  1,165 个公开安装资产的下载逻辑及校验值检查通过。
- CDN 上的 296 个公开静态文件逐个 SHA-256 比对一致；价格与指南使用的
  实际线上 JS/CSS 均返回 200，JS 语法检查通过。
- Windows x64 v1.0.13 安装包完整下载，SHA-256 与 GitHub 一致；
  `Range: bytes=1048576-1049599` 返回 206，内容与完整文件对应区间一致。
- 页面缓存命中 HIT，公开价格接口的 43 条模型记录与原服务一致。
- `acecode.cc` 和 `ge.bigjuan.xyz` 的公开 GET/HEAD 页面入口重定向到 CDN；
  `/customerv2`、`/api/customer/*`、`/api/key-usage/*` 与 `/aceapi/*` 保留原处理。
  本机 `:82/aupdate/download` 和 `help` 的 51 个 HTML 页面加入跳转，
  本机更新清单及安装包不变。
- 当前没有可连接的浏览器，未实测浏览器交互、桌面和手机视觉布局。
  构建及 HTTP 结果不代表已完成这项人工验收。

现有 Bunny 区域保持 Standard 计费类型。常规页面边缘缓存 300 秒、
浏览器缓存 60 秒；公开价格为 60/30 秒；版本安装包为 604800/3600 秒。
下载清单在 Pages 工作流运行时更新；尚未把 ACECode 发布流水线接入
`repository_dispatch`，发布新版本后需运行 README 中的刷新命令。
