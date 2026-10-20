import type { PublicModelPricingRow } from '../types'

export const INPUT_PRICE_BASELINE = 'gpt-6-sol'

export function textInputMultiplier(row: PublicModelPricingRow, rows: PublicModelPricingRow[]): number | null {
  if (row.media_unit || /^gpt-image-|^acemodel-image/.test(row.model)) return null
  const baseline = rows.find(item => item.channel === 'codex' && item.model === INPUT_PRICE_BASELINE)
  const basePrice = baseline?.pricing.input
  const inputPrice = row.pricing.input
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice <= 0
    || typeof inputPrice !== 'number' || !Number.isFinite(inputPrice) || inputPrice < 0) return null
  return inputPrice / basePrice
}

export function formatInputMultiplier(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) return '—'
  if (value > 0 && value < 0.01) return '<0.01×'
  return `${Number(value.toFixed(2))}×`
}

// Output-token formula verified against the official image-generation calculator:
// https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency
// Use the site's live output rate, not a hard-coded upstream dollar price.
export function imagePriceEstimate(row: PublicModelPricingRow): { usd: number; size: string; exact: boolean } | null {
  if (row.pricing.user_billing_mode === 'per_image' && Number(row.pricing.image_unit_price) > 0) {
    return { usd: Number(row.pricing.image_unit_price), size: '', exact: true }
  }
  if (row.media_unit === 'image' && Number(row.pricing.media_unit_cost) > 0) {
    return { usd: Number(row.pricing.media_unit_cost), size: '', exact: true }
  }
  const model = row.canonical_model || row.model
  if (!/^gpt-image-2(?:\.5-(?:flare|sunburst))?(?:-\d{4}-\d{2}-\d{2})?(?:-(?:2k|4k))?$/.test(model)) return null
  const rate = row.pricing.output
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
  const [width, height] = /-4k$/.test(row.model) ? [3840, 2160] : /-2k$/.test(row.model) ? [2048, 2048] : [1024, 1024]
  const gridLong = model.startsWith('gpt-image-2.5-') ? 24 : 48 // medium quality
  const scaledShort = gridLong * Math.min(width, height) / Math.max(width, height)
  const floor = Math.floor(scaledShort)
  const gridShort = scaledShort - floor === 0.5 ? floor + floor % 2 : Math.round(scaledShort)
  const outputTokens = Math.ceil(gridLong * gridShort * (2_000_000 + width * height) / 4_000_000)
  return { usd: outputTokens * rate / 1_000_000, size: `${width}×${height}`, exact: false }
}

export function formatImageEstimate(value: number): string {
  return value > 0 && value < 0.001 ? '<$0.001' : `$${Number(value.toFixed(3))}`
}
