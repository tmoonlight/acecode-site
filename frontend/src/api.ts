import type { PublicModelPricingRow } from './types'

const siteRoot = new URL(/* @vite-ignore */ '../../', import.meta.url)
export const api = {
  async getPublicModelPricing(): Promise<{ models: PublicModelPricingRow[] }> {
    // Bunny serves only this public read-only endpoint from the existing API.
    // Direct GitHub Pages access uses the exported snapshot.
    const path = ['acecodedownload.b-cdn.net', 'acecode.cc'].includes(location.hostname)
      ? 'api/key-usage/pricing' : 'data/pricing.json'
    const response = await fetch(new URL(path, siteRoot), {
      credentials: 'omit', headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`价格信息读取失败（HTTP ${response.status}）`)
    const value = await response.json()
    if (!Array.isArray(value.models)) throw new Error('价格信息格式错误')
    return value
  },
}
