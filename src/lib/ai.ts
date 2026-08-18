import type { ClosetItem } from '../types'

const KEY_STORE = 'fitcheck:anthropic-key'
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

export function getApiKey(): string | null {
  try { return localStorage.getItem(KEY_STORE) } catch { return null }
}

export function setApiKey(key: string): void {
  try { localStorage.setItem(KEY_STORE, key) } catch { /* ignore */ }
}

export function clearApiKey(): void {
  try { localStorage.removeItem(KEY_STORE) } catch { /* ignore */ }
}

export async function* analyzeOutfit(
  items: ClosetItem[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('no-key')

  const descriptions = items.map(item => {
    const parts: string[] = [`${item.category}: "${item.name}"`]
    if (item.colors.length) parts.push(`colors: ${item.colors.join(', ')}`)
    if (item.vibes.length) parts.push(`vibe: ${item.vibes.join(', ')}`)
    if (item.notes) parts.push(`note: ${item.notes}`)
    return '• ' + parts.join(' | ')
  }).join('\n')

  const prompt = `You're a brutally honest but supportive personal stylist. Analyze this outfit from my wardrobe:

${descriptions}

Break it down with exactly these 5 sections:

🎨 Color Story — how the colors interact, any harmony or awkward clash

🧵 Texture & Fabric — based on the item names (e.g. "knitted", "denim", "satin", "ribbed", "linen"), how do the textures mix?

✨ Vibe Check — does the style feel cohesive, or is something pulling in a different direction?

💪 What's Working — the strongest elements of this outfit, be specific about which pieces

🔄 What to Tweak — honest, actionable suggestions; name the specific piece to change and what to swap it for if anything feels off

Keep each section to 2–3 sharp sentences. Be real, not fluffy. Think best friend who actually knows fashion.`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-ipc': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 900,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal,
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('invalid-key')
    if (response.status === 429) throw new Error('rate-limited')
    throw new Error(`api-error-${response.status}`)
  }

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        try {
          const parsed = JSON.parse(data)
          if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
            const text: string = parsed.delta.text
            if (text) yield text
          }
        } catch { /* skip non-JSON lines */ }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
