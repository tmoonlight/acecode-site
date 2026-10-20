import { StrictMode } from 'react'
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

const SITE = 'https://acecode.cc'
const rootPath = new URL(/* @vite-ignore */ '../../', import.meta.url).pathname.replace(/\/$/, '')
const links = [
  ['产品', 'Product', SITE + '/acemodel/'],
  ['模型价格', 'Model pricing', SITE + '/key-usage/pricing/'],
  ['下载', 'Download', SITE + '/download/'],
  ['帮助', 'Help', SITE + '/key-usage/guide/'],
  ['用户中心', 'Account', 'https://customers.acecode.cc/customerv2'],
]

function PublicApp() {
  const { i18n } = useTranslation()
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const chinese = i18n.language.startsWith('zh')
  return <div className="ace-public">
    <a className="ace-skip" href="#ace-content">{chinese ? '跳到主要内容' : 'Skip to content'}</a>
    <header className="ace-site-header"><div className="ace-header-inner">
      <a className="ace-brand" href={SITE + '/acemodel/'} aria-label="ACECode"><span className="ace-brand-mark" aria-hidden="true">AC</span><span>ACECode</span></a>
      <nav className="ace-site-nav" aria-label={chinese ? '网站导航' : 'Site navigation'}>
        {links.map(([zh, en, href], index) => <a key={href} href={href} className={index === 4 ? 'ace-nav-cta' : undefined} aria-current={href.endsWith(pathname) ? 'page' : undefined}>{chinese ? zh : en}</a>)}
        <a href="https://github.com/tmoonlight/acecode" target="_blank" rel="noopener noreferrer" aria-label="GitHub 开源仓库"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.81 8.21 11.4.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.81 1.3 3.49 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.52 11.52 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.58A12.01 12.01 0 0024 12C24 5.37 18.63 0 12 0z"/></svg></a>
      </nav>
      <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label={chinese ? '切换明暗主题' : 'Toggle color theme'}>{theme === 'dark' ? <Sun /> : <Moon />}</Button>
    </div></header>
    <div id="ace-content"><Routes>
      <Route path="/key-usage/pricing/*" element={<PublicModelPricing />} />
      <Route path="/key-usage/guide/*" element={<ClientIntegrationGuide />} />
      <Route path="*" element={<p>页面不存在。<a href={SITE + '/'}>返回首页</a></p>} />
    </Routes></div>
    <footer className="ace-site-footer"><a href={SITE + '/acemodel/'}>ACECode</a><span>ACEModel</span><a href={SITE + '/key-usage/guide/'}>{chinese ? '接入指南' : 'Setup guide'}</a></footer>
  </div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter basename={rootPath || undefined}><ThemeProvider><PublicApp /></ThemeProvider></BrowserRouter></StrictMode>,
)
