export type UserBillingMode = 'per_token' | 'per_image';
export interface ModelPricingOverride {
  user_billing_mode?: UserBillingMode
  image_unit_price?: number
  /** Upstream cost per media unit (USD / image or USD / second) for Grok Imagine models. */
  media_unit_cost?: number
  image_input?: number
  cached_image_input?: number
  source?: string
  input?: number
  cached_input?: number
  cache_write_5m?: number
  cache_write_1h?: number
  output?: number
  input_priority?: number
  cached_input_priority?: number
  output_priority?: number
  input_long?: number
  cached_input_long?: number
  output_long?: number
  input_long_priority?: number
  cached_input_long_priority?: number
  output_long_priority?: number
  long_context_threshold_tokens?: number
}

export interface PublicModelPricingRow {
  model: string
  channel?: string
  media_unit?: 'image' | 'second'
  source: string
  pricing: ModelPricingOverride
  canonical_model?: string
  is_alias?: boolean
}
