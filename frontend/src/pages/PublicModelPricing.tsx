import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Loader2,
    RefreshCw,
  Search,
  } from 'lucide-react'

import { api } from '../api'
import ModelLogo from '../components/ModelLogo'
import type { ModelPricingOverride, PublicModelPricingRow } from '../types'
import { getErrorMessage } from '../utils/error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { INPUT_PRICE_BASELINE, textInputMultiplier, formatInputMultiplier, imagePriceEstimate, formatImageEstimate } from '../lib/pricingComparison'
const TRIAL_AMOUNT_CENTS = 99
const TRIAL_CREDIT_USD = 6

const CHANNELS = ['all', 'codex', 'grok', 'antigravity', 'claude'] as const
type Channel = typeof CHANNELS[number]

// Customer-facing visibility only. Remove a channel here when it is ready to launch.
const HIDDEN_PUBLIC_PRICING_CHANNELS: ReadonlySet<string> = new Set(['antigravity'])
const HIDDEN_PUBLIC_PRICING_MODELS: ReadonlySet<string> = new Set(['gpt-5.3-codex-spark', 'codex-auto-review'])
const ACE_MODEL_NAMES: Record<string, string> = { aurora: 'Aurora', moonlight: 'Moonlight', starrylight: 'Starrylight' }

const CHANNEL_LABELS: Record<Exclude<Channel, 'all'>, string> = {
  codex: 'Codex',
  grok: 'Grok',
  antigravity: 'Antigravity',
  claude: 'Claude',
}

function normalizeChannel(value?: string): Exclude<Channel, 'all'> {
  const channel = value?.toLowerCase()
  return channel === 'grok' || channel === 'antigravity' || channel === 'claude' ? channel : 'codex'
}

function price(value: unknown): string {
  const number = Number(value)
  if (!Number.isFinite(number)) return '$0'
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
}

function hasLongContext(pricing: ModelPricingOverride): boolean {
  return Number(pricing.long_context_threshold_tokens ?? 0) > 0
    && (Number(pricing.input_long ?? 0) > 0 || Number(pricing.output_long ?? 0) > 0)
}

function hasPriority(pricing: ModelPricingOverride): boolean {
  return Number(pricing.input_priority ?? 0) > 0 || Number(pricing.output_priority ?? 0) > 0
}

export default function PublicModelPricing() {
  const embedded = false
  const { t, i18n } = useTranslation()
  const [rows, setRows] = useState<PublicModelPricingRow[]>([])
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState<Channel>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isChinese = i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ?? false

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.getPublicModelPricing()
      setRows(result.models ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

  }, [])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (HIDDEN_PUBLIC_PRICING_CHANNELS.has(normalizeChannel(row.channel))) return false
      if (HIDDEN_PUBLIC_PRICING_MODELS.has(row.model.toLowerCase())) return false
      if (channel !== 'all' && normalizeChannel(row.channel) !== channel) return false
      return !normalizedQuery || row.model.toLowerCase().includes(normalizedQuery)
    })
  }, [channel, query, rows])


  return (
    <div className={embedded ? "space-y-5" : "min-h-dvh bg-background text-foreground"}>
      <div className={embedded ? "space-y-5" : "ace-content-shell space-y-6"}>
        <section className="flex flex-col gap-5 border-b border-border pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{t('keyUsage.pricingTitle')}</h1>

              </div>
            </div>
            <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {t('common.refresh')}
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t('keyUsage.pricingSearch')} placeholder={t('keyUsage.pricingSearch')} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHANNELS.filter((item) => !HIDDEN_PUBLIC_PRICING_CHANNELS.has(item)).map((item) => (
                <Button key={item} type="button" aria-pressed={channel === item} variant={channel === item ? 'default' : 'outline'} size="sm" onClick={() => setChannel(item)}>
                  {item === 'all' ? t('common.all') : CHANNEL_LABELS[item]}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-primary bg-primary p-5 text-primary-foreground" aria-label={(i18n.language === 'zh-TW' ? '體驗包' : isChinese ? '体验包' : 'Trial pack')}>
          <div>
            <h2 className="font-semibold">{(i18n.language === 'zh-TW' ? '體驗包' : isChinese ? '体验包' : 'Trial pack')}</h2>
            <p className="mt-1 text-xl sm:text-2xl"><strong>¥{TRIAL_AMOUNT_CENTS / 100}</strong><span className="mx-2">→</span><strong>${TRIAL_CREDIT_USD}</strong> {(i18n.language === 'zh-TW' ? '模型額度' : isChinese ? '模型额度' : 'model credits')}</p>
            <p className="mt-1 text-sm">{(i18n.language === 'zh-TW' ? '每人限購一次' : isChinese ? '每人限购一次' : 'One purchase per person')}</p>
          </div>
          <Button asChild variant="secondary"><a href="https://customers.acecode.cc/customerv2/wallet?plan=trial">{(i18n.language === 'zh-TW' ? '購買體驗包' : isChinese ? '购买体验包' : 'Get trial pack')}</a></Button>

        </section>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        ) : null}

        {loading && rows.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            {t('common.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground">
            {t('keyUsage.pricingEmpty')}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {(i18n.language === 'zh-TW' ? `輸入倍率以 ${INPUT_PRICE_BASELINE} = 1×；實際費用按輸入、快取和輸出分別計算。` : isChinese ? `输入倍率以 ${INPUT_PRICE_BASELINE} = 1×；实际费用按输入、缓存和输出分别计算。` : `Input multiplier: ${INPUT_PRICE_BASELINE} = 1×. Input, cache and output are billed separately.`)}
            </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((row) => (
              <PricingCard key={`${row.channel}:${row.model}`} row={row} multiplier={textInputMultiplier(row, rows)} />
            ))}
          </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PricingCard({ row, multiplier }: { row: PublicModelPricingRow; multiplier: number | null }) {
  const { t, i18n } = useTranslation()
  const isChinese = i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ?? false
  const channel = normalizeChannel(row.channel)
  const pricing = row.pricing
  const imageEstimate = imagePriceEstimate(row)
  const values = row.media_unit ? [[row.media_unit === 'image' ? ((i18n.language === 'zh-TW' ? '每張圖片' : isChinese ? '每张图片' : 'Per image')) : ((i18n.language === 'zh-TW' ? '每秒影片' : isChinese ? '每秒视频' : 'Per second')), pricing.image_unit_price || pricing.media_unit_cost]] as const : [
    [t('settings.pricing.shortInput'), pricing.input],
    [t('settings.pricing.shortCached'), pricing.cached_input],
    [t('settings.pricing.shortOutput'), pricing.output],
  ] as const

  return (
    <Card className="py-0 shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ModelLogo model={row.model} size={38} />
            <div className="min-w-0">
              <h3 className="break-words text-base font-semibold" title={row.model}>{ACE_MODEL_NAMES[row.model] || row.model}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">{ACE_MODEL_NAMES[row.model] ? 'ACEModel' : CHANNEL_LABELS[channel]}</Badge>
                {row.is_alias && !ACE_MODEL_NAMES[row.model] ? <Badge variant="outline" className="text-xs">{isChinese ? (i18n.language === 'zh-TW' ? '別名' : '别名') : 'Alias'}</Badge> : null}
                {hasLongContext(pricing) ? <Badge variant="outline" className="text-xs">{isChinese ? (i18n.language === 'zh-TW' ? '長上下文' : '长上下文') : 'Long context'}</Badge> : null}
                {hasPriority(pricing) ? <Badge variant="outline" className="text-xs">{isChinese ? (i18n.language === 'zh-TW' ? '優先處理' : '优先处理') : 'Priority'}</Badge> : null}
              </div>
            </div>
          </div>
          {imageEstimate ? (
            <div className="shrink-0 rounded-md bg-primary px-3 py-2 text-right text-primary-foreground" aria-label={(i18n.language === 'zh-TW' ? '單張估價' : isChinese ? '单张估价' : 'Per-image estimate')}>
              <div className="text-xs">{imageEstimate.exact ? ((i18n.language === 'zh-TW' ? '每張' : isChinese ? '每张' : 'Per image')) : ((i18n.language === 'zh-TW' ? '約 / 張' : isChinese ? '约 / 张' : 'Est. / image'))}</div>
              <div className="font-mono text-lg font-semibold tabular-nums">{formatImageEstimate(imageEstimate.usd)}</div>
            </div>
          ) : !row.media_unit && !/^gpt-image-|^acemodel-image/.test(row.model) ? (
            <div className="shrink-0 rounded-md bg-primary px-3 py-2 text-right text-primary-foreground" aria-label={(i18n.language === 'zh-TW' ? '輸入倍率' : isChinese ? '输入倍率' : 'Input multiplier')}>
              <div className="text-xs">{(i18n.language === 'zh-TW' ? '輸入倍率' : isChinese ? '输入倍率' : 'Input multiplier')}</div>
              <div className="font-mono text-lg font-semibold tabular-nums">{formatInputMultiplier(multiplier)}</div>
            </div>
          ) : null}
        </div>

        <div className={`mt-4 grid gap-2 ${row.media_unit ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {values.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border/70 bg-muted/25 px-2.5 py-2.5">
              <div className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground" title={label}>{label}</div>
              <div className="mt-1 font-mono text-sm font-bold tabular-nums">{price(value)}</div>
            </div>
          ))}
        </div>
        {!row.media_unit && <div className="mt-2 text-right text-xs text-muted-foreground">{t('keyUsage.pricingUnit')}</div>}
        {imageEstimate && !imageEstimate.exact && <p className="mt-2 text-xs text-muted-foreground">{(i18n.language === 'zh-TW' ? `${imageEstimate.size} 中畫質輸出估價；提示詞和參考圖另計。` : isChinese ? `${imageEstimate.size} 中画质输出估价；提示词和参考图另计。` : `${imageEstimate.size}, medium-quality output estimate; text and reference images cost extra.`)}</p>}
      </CardContent>
    </Card>
  )
}
