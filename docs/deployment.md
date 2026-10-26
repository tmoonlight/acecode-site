# GitHub Pages 与 CDN 部署

## 范围与责任

产品 `/acemodel/`、下载 `/download/`、帮助 `/help/` 和 `/acecode/`、
价格 `/key-usage/pricing/`、接入指南 `/key-usage/guide/` 由本仓库发布。
导航中的用户中心、登录、充值等动作进入 `https://customers.acecode.cc/customerv2`。
模型 API 接入地址继续使用 `https://acecode.cc/aceapi/v1`。

网页、脚本、样式、字体、截图和宣传片由 Bunny 提供。
`acecode.cc` 的公开路径由现有 Caddy 代理到 Bunny，地址栏保留官网域名。
安装包链接直接使用 Bunny。API 路径仍直达原服务器，未加入 CDN。
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

网站更新通过 push 自动部署。ACECode 发布工作流在 Release 成功后调用
`refresh-public-downloads.yml`，使用仅限本站的 SSH 部署密钥更新公开清单
和 `public/data/release-source.json`，触发本站 push 部署。
生成器使用 `--require-tag <tag> --releases-only` 校验目标版本的核心资产、
SHA-256 和校验文件；失败不推送。同步后等待 CDN 清单哈希与提交内容一致。
重复运行没有内容变化时不创建空提交。

维护时可在 ACECode Actions 中重跑网站同步任务，或手动触发该工作流并填写
已有发布标签；网站自身构建失败时修复后重跑本站 `Deploy Pages`。
普通发布无需用户执行刷新命令。保留原 `repository_dispatch` 接口兼容既有调用。

## 验收

- 类型检查、生产构建、全部 HTML 本地资源引用和公开导航检查。
- GitHub Pages 部署完成后核对各公开页面和静态资源。
- CDN 逐页 HTTP、缓存和完整安装包哈希检查。
- 浏览器检查价格筛选、语言、指南标签页、下载清单、宣传片和桌面/手机布局。
- 核对用户中心链接使用独立子域名；不复制账户后台、数据或凭据。

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
下载清单在 Pages 工作流运行时更新；初次部署时的人工刷新步骤现由上述
发布后同步流程替代。

## 官网与用户中心域名

DNS 使用 NameSilo/DNSOWL。根域名保持现有 A 记录，新增用户中心子域名：

| 类型 | 主机 | 值 |
| --- | --- | --- |
| A | @（或留空） | 195.201.40.127 |
| A | customers | 195.201.40.127 |

NameSilo 不支持根域名 CNAME/ALIAS，因此不将根域名直接改为 Bunny CNAME。
Caddy 只代理公开 GET/HEAD 页面、`/_app/*`、下载清单与静态资源到 CDN；
`/aceapi/*`、`/api/customer/*`、`/api/key-usage/*` 等原有接口保持原后端。
原 `/customerv2` 和 `/customer` 的页面 GET/HEAD 请求跳转到新子域名并保留路径及查询。

新用户中心沿用已有应用与数据库。仅在 `customers.acecode.cc` 的
`/api/customer/*` 请求上，将精确匹配的新 Origin 映射为后端现有的规范 Origin；
其他来源仍受原校验限制。该兼容层避免重启模型 API 进程，
原支付回调与接入地址继续有效。新域名首次访问需要重新登录。

## 全站语言

首页、下载页、模型价格、接入指南、帮助文档和用户中心统一支持简体中文、
繁体中文与英文。未手动选择时使用共享的浏览器语言选择逻辑，依次匹配
`navigator.languages` 和 `navigator.language`。支持简体中文、繁体中文
与英文；中文的 Hans/Hant 脚本优先于地区，台湾、香港、澳门默认繁体。
没有可识别的偏好时回退英文，没有提供语言信息时使用中文。
首页保留中文静态内容作为 JavaScript 不可用时的回退。

顶部菜单的手动选择优先于浏览器语言，保存到 `acecode.site.language.v1`
以及 `ace_site_language` Cookie。官网与用户中心通过父域 Cookie 共享选择；
CDN 与官网之间的页面链接携带 `lang`，到达后保存并清除该参数，保留原有查询
和锚点。API、安装包、媒体文件和第三方链接不携带语言参数。
同源页面通过 storage 事件同步；跨子域页面在重新聚焦时读取最新 Cookie。

React 页面即时切换；下载页与文档页重新加载以统一静态和动态界面文案。
用户指定文档正文、历史发布说明保留原文。下载页的视频继续默认静音播放。
历史 `localStorage.lang` 不覆盖新的全站偏好。

`node --test scripts/browser-language.test.mjs scripts/site-language.test.mjs`
检查浏览器默认值、手动选择、跨页面持久化、跨域链接、存储受限、同源同步、
React 同步及界面文案覆盖。用户中心使用相同的共享模块，作为前端静态发布
更新；模型 API 进程、接口地址和 Caddy 配置均不变。

## 全站外观

### 公共导航位置与字体

首页、下载、价格、接入指南和客户站公共入口使用同一导航布局。规范来源为
`public/acemodel/assets/site-header.css`，ACEProxy 中的
`frontend/src/public-site-header.css` 必须保持相同字节。导航使用浏览器 serif
字体，下载页正文继续保留点阵体。每项链接、GitHub、语言和主题控件均有固定
槽位；悬停不移动元素。1000px 以下统一两行，窄屏菜单可横向滚动。

`node --test scripts/navigation.browser.test.mjs` 在构建后比较四个公开入口的
真实布局，覆盖三种宽度、三种语言、明暗主题及悬停。设置 `CUSTOMER_NAV_DIST`
为 ACEProxy 构建目录可把客户入口一起比对。修改这份样式时须同步两个仓库，
发布后从实际域名切换页面并检查控件位置；只构建一个站点不能视作完成。

首页、下载页、模型价格、接入指南、两套帮助文档和用户中心使用同一个浅色/
深色设置。未选择时跟随系统，系统主题改变时即时更新；顶部太阳/月亮按钮
保存手动选择。历史 React `theme` 和文档 `acecode-help-theme` 首次迁移到
`acecode.site.theme.v1`，之后由新偏好与父域 `ace_site_theme` Cookie 决定。

官网与用户中心共享 Cookie，已打开的同源标签页通过 storage 事件同步；
跨子域在 Cookie Store 通知、重新聚焦、返回页面时同步。CDN 与官网的页面
跳转携带 `theme` 参数，目标页面保存后移除它，保留 `lang`、其他查询和锚点。
API、安装包、视频及第三方链接不添加主题参数。存储被禁用时仍可切换当前页。

`public/acemodel/assets/site-theme.js` 在首屏绘制前执行，是唯一主题状态来源。
React 的 `ThemeProvider` 订阅该状态，保留原来的配色方案设置。构建中的
`frontend/public/site-theme.js` 与其内容一致，由测试防止漂移。用户中心部署
同一脚本，保留原内联配色初始化脚本的内容及 CSP 校验哈希，不重启后端。

`node --test scripts/site-theme.test.mjs` 覆盖系统偏好、旧值迁移、共享持久化、
跨域导航、存储受限、已打开页面同步与全站接入。深色配色覆盖背景、导航、
按钮、选项、正文、表格和文档弹层。发布同时更新静态资源版本并清除 CDN
缓存，避免已访问页面继续使用旧脚本。

## 首页下载与视频

首页下载按钮读取同源 `aceupdate.json` 的最新正式版，按浏览器平台和可用的
架构提示选择完整安装包（Windows ZIP、macOS PKG、Linux TAR.GZ），不会选择
增量更新包。版本号随现有发布清单自动更新；手机、缺失架构或清单读取失败时
保留下载页入口。右侧的历史版本按钮始终进入完整下载页。

下载页宣传片在首屏内自动播放，默认静音并保留原生播放、进度和全屏控制。
旁边的喇叭按钮与原生音量状态同步。浏览器阻止自动播放或媒体失败时提供
页内播放/重试入口，不再弹出播放器。`node --test scripts/public-download.test.mjs`
覆盖包选择、版本更新、回退、静音切换和自动播放被拒绝的情况。
