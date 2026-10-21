import { StrictMode, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { Button } from './components/ui/button'
import PublicModelPricing from './pages/PublicModelPricing'
import ClientIntegrationGuide from './components/ClientIntegrationGuide'
import './i18n'
import './index.css'
import '../../public/acemodel/assets/language-menu.css'
import { setSiteLanguage, languageOptions } from '../../public/acemodel/assets/site-language.js'

const SITE = 'https://acecode.cc'
const rootPath = new URL(/* @vite-ignore */ '../../', import.meta.url).pathname.replace(/\/$/, '')
const links = [
  SITE + '/acemodel/',
  SITE + '/key-usage/pricing/',
  SITE + '/download/',
  SITE + '/key-usage/guide/',
  'https://customers.acecode.cc/customerv2',
]
const siteCopy = {
  zh: {
    links: ['产品', '模型价格', '下载', '帮助', '用户中心'],
    skip: '跳到主要内容', navigation: '网站导航', github: 'GitHub 开源仓库',
    theme: '切换明暗主题', missing: '页面不存在。', back: '返回首页', guide: '接入指南',
    pricingTitle: '模型价格 · ACECode', guideTitle: 'ACEModel 大模型接入指南',
  },
  'zh-TW': {
    links: ['產品', '模型價格', '下載', '說明', '用戶中心'],
    skip: '跳到主要內容', navigation: '網站導覽', github: 'GitHub 開源儲存庫',
    theme: '切換明暗主題', missing: '頁面不存在。', back: '返回首頁', guide: '接入指南',
    pricingTitle: '模型價格 · ACECode', guideTitle: 'ACEModel 大模型接入指南',
  },
  en: {
    links: ['Product', 'Model pricing', 'Download', 'Help', 'Account'],
    skip: 'Skip to content', navigation: 'Site navigation', github: 'GitHub repository',
    theme: 'Toggle color theme', missing: 'Page not found. ', back: 'Back to home', guide: 'Integration guide',
    pricingTitle: 'Model pricing · ACECode', guideTitle: 'ACEModel integration guide',
  },
}

function PublicApp() {
  const { i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const copy = siteCopy[i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language.startsWith('zh') ? 'zh' : 'en']
  useEffect(() => {
    document.title = pathname.startsWith('/key-usage/pricing') ? copy.pricingTitle : copy.guideTitle
  }, [pathname, copy])
  return <div className="ace-public">
    <a className="ace-skip" href="#ace-content">{copy.skip}</a>
    <header className="ace-site-header"><div className="ace-header-inner">
      <a className="ace-brand" href={SITE + '/acemodel/'} aria-label="ACECode"><span className="ace-brand-mark" aria-hidden="true">AC</span><span>ACECode</span></a>
      <nav className="ace-site-nav" aria-label={copy.navigation}>
        {links.map((href, index) => <a key={href} href={href} className={index === 4 ? 'ace-nav-cta' : undefined} aria-current={href.endsWith(pathname) ? 'page' : undefined}>{copy.links[index]}</a>)}
        <a className="ace-nav-github" href="https://github.com/tmoonlight/acecode" target="_blank" rel="noopener noreferrer" aria-label={copy.github}><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.81 8.21 11.4.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.81 1.3 3.49 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.52 11.52 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.58A12.01 12.01 0 0024 12C24 5.37 18.63 0 12 0z"/></svg></a>
      </nav>
      <span data-site-language><select className="site-language" aria-label={i18n.language === 'en' ? 'Language' : i18n.language === 'zh-TW' ? '語言' : '语言'} value={i18n.language} onChange={event => setSiteLanguage(event.target.value)}>
        {languageOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></span>
      <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={copy.theme}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>
    </div></header>
    <div id="ace-content"><Routes>
      <Route path="/key-usage/pricing/*" element={<PublicModelPricing />} />
      <Route path="/key-usage/guide/*" element={<ClientIntegrationGuide />} />
      <Route path="*" element={<p>{copy.missing}<a href={SITE + '/'}>{copy.back}</a></p>} />
    </Routes></div>
    <footer className="ace-site-footer"><a href={SITE + '/acemodel/'}>ACECode</a><span>ACEModel</span><a href={SITE + '/key-usage/guide/'}>{copy.guide}</a></footer>
  </div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter basename={rootPath || undefined}><ThemeProvider><PublicApp /></ThemeProvider></BrowserRouter></StrictMode>,
)
