type Mode = 'light' | 'dark' | 'system'
interface SiteTheme {
  getMode(): Mode
  get(): 'light' | 'dark'
  set(mode: Mode): boolean
  refresh(): void
  subscribe(listener: () => void): () => void
}
declare global { interface Window { ACETheme: SiteTheme } }
// Initialized synchronously in index.html, before either CSS or React renders.
export const siteTheme = window.ACETheme
