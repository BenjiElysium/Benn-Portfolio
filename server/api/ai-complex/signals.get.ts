/**
 * GET /api/ai-complex/signals
 * Reads the "AI Complex" Signals + Readings databases from Notion server-side
 * and returns a PUBLIC-SAFE projection for the AI Complex app.
 *
 * Publishing is opt-in per signal: a row ships only when its `Public` box is
 * ticked AND it has a `Public Label`. Output is an explicit allowlist — Notes,
 * Latest/Prior Value prose, source notes, working titles, links and Notion
 * IDs never leave this handler. Readings inherit visibility from their signal.
 *
 * The integration token is read-only and scoped to these two databases.
 * Cache TTL: 10 min; a stale copy is served if Notion is unreachable.
 */

const NOTION_VERSION = '2025-09-03'
const SIGNALS_DS = 'c77ad08f-1475-4368-827a-ca45637ee10f'
const READINGS_DS = 'c09d54db-e182-4cd2-bd77-89c507496375'
const TTL_MS = 10 * 60_000

export interface PublicReading {
  series: string        // reading title minus its trailing "— <period>"
  date: string          // ISO date
  value: number
  unit: string
  display: string       // human-readable value, e.g. "$89.0B, +117% YoY"
  status: string | null
  guidance: boolean     // dated in the future → guided/projected, not actual
}

export interface PublicSignal {
  id: string            // slug of the public label (not the Notion page id)
  label: string
  category: string
  status: string
  direction: string
  frequency: string | null
  leadMonths: number | null
  unit: string | null
  amberLevel: number | null
  redLevel: number | null
  dangerDirection: 'Falls below' | 'Rises above' | null
  source: string | null
  readings: PublicReading[]
}

export interface AiComplexPayload {
  fetchedAt: string
  signals: PublicSignal[]
}

let cache: { ts: number; data: AiComplexPayload } | null = null

// ── Notion property readers ─────────────────────────────────────
type Props = Record<string, any>
const text = (p: any): string =>
  (p?.title ?? p?.rich_text ?? []).map((t: any) => t.plain_text).join('').trim()
const select = (p: any): string | null => p?.select?.name ?? null
const num = (p: any): number | null => (typeof p?.number === 'number' ? p.number : null)
const dateStart = (p: any): string | null => p?.date?.start ?? null
const relIds = (p: any): string[] => (p?.relation ?? []).map((r: any) => r.id.replace(/-/g, ''))

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
// "Anthropic run-rate — end July 2026" → "Anthropic run-rate"
const seriesName = (title: string) => title.split(/\s[—–]\s/)[0].trim()

async function queryAll(key: string, dataSourceId: string, filter?: object) {
  const pages: any[] = []
  let cursor: string | undefined
  do {
    const res: any = await $fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Notion-Version': NOTION_VERSION },
      body: { page_size: 100, ...(filter && { filter }), ...(cursor && { start_cursor: cursor }) },
    })
    pages.push(...res.results)
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return pages
}

async function load(key: string): Promise<AiComplexPayload> {
  const [signalPages, readingPages] = await Promise.all([
    queryAll(key, SIGNALS_DS, { property: 'Public', checkbox: { equals: true } }),
    queryAll(key, READINGS_DS),
  ])

  const today = new Date().toISOString().slice(0, 10)
  const byPageId = new Map<string, PublicSignal>()

  for (const page of signalPages) {
    const p: Props = page.properties
    const label = text(p['Public Label'])
    if (!p.Public?.checkbox || !label) continue // belt and braces: never fall back to working titles
    const danger = select(p['Danger Direction'])
    byPageId.set(page.id.replace(/-/g, ''), {
      id: slug(label),
      label,
      category: select(p.Category) ?? 'Other',
      status: select(p.Status) ?? 'Not yet tracked',
      direction: select(p.Direction) ?? 'Not yet read',
      frequency: select(p.Frequency),
      leadMonths: num(p['Lead Time (mo)']),
      unit: select(p['Chart Unit']),
      amberLevel: num(p['Amber Level']),
      redLevel: num(p['Red Level']),
      dangerDirection: danger === 'Falls below' || danger === 'Rises above' ? danger : null,
      source: text(p.Source) || null,
      readings: [],
    })
  }

  for (const page of readingPages) {
    const p: Props = page.properties
    const title = text(p.Reading)
    const date = dateStart(p.Date)
    const value = num(p['Numeric Value'])
    if (!title || !date || value === null || /^duplicate\b/i.test(title)) continue
    for (const sid of relIds(p.Signal)) {
      const signal = byPageId.get(sid)
      if (!signal) continue // reading of a non-public signal
      signal.readings.push({
        series: seriesName(title),
        date: date.slice(0, 10),
        value,
        unit: select(p.Unit) ?? signal.unit ?? '',
        display: text(p['Display Value']),
        status: select(p['Status at reading']),
        guidance: date.slice(0, 10) > today,
      })
    }
  }

  const signals = [...byPageId.values()]
  signals.forEach(s => s.readings.sort((a, b) => a.date.localeCompare(b.date)))
  return { fetchedAt: new Date().toISOString(), signals }
}

export default defineEventHandler(async () => {
  const key = useRuntimeConfig().notionApiKey as string
  if (!key) throw createError({ statusCode: 503, message: 'Notion key not configured' })

  if (cache && Date.now() - cache.ts < TTL_MS) return cache.data
  try {
    const data = await load(key)
    cache = { ts: Date.now(), data }
    return data
  } catch (err) {
    if (cache) return cache.data // serve stale rather than go dark
    console.error('[ai-complex] Notion fetch failed', (err as any)?.statusCode ?? err)
    throw createError({ statusCode: 502, message: 'Could not load signals' })
  }
})
