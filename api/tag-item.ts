export const config = { runtime: 'edge' }

const VALID_VIBES = ['casual','preppy','sporty','edgy','minimalist','luxury','romantic','streetwear','boho','y2k']
const VALID_COLORS = ['Black','White','Ivory','Gray','Charcoal','Beige','Tan','Brown','Denim Blue','Navy','Sky Blue','Teal','Green','Olive','Sage','Red','Burgundy','Pink','Hot Pink','Orange','Rust','Yellow','Mustard','Purple','Lavender','Gold','Silver']

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const apiKey = req.headers.get('x-anthropic-key')
  if (!apiKey) return new Response(JSON.stringify({ error: 'no-key' }), { status: 401, headers: { 'Content-Type': 'application/json' } })

  let image: string
  try {
    const body = await req.json() as { image: string }
    image = body.image
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const match = image.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return new Response('Invalid image format', { status: 400 })
  const [, mediaType, base64Data] = match

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Data },
          },
          {
            type: 'text',
            text: `Analyze this clothing item photo. Reply with ONLY a valid JSON object, nothing else:
{
  "suggestedName": "short descriptive name e.g. 'Black Ribbed Tank Top' or 'Cream Linen Wide-Leg Trousers'",
  "vibes": ["1-3 tags from ONLY these: casual, preppy, sporty, edgy, minimalist, luxury, romantic, streetwear, boho, y2k"],
  "colors": ["from ONLY these: Black, White, Ivory, Gray, Charcoal, Beige, Tan, Brown, Denim Blue, Navy, Sky Blue, Teal, Green, Olive, Sage, Red, Burgundy, Pink, Hot Pink, Orange, Rust, Yellow, Mustard, Purple, Lavender, Gold, Silver"],
  "description": "2 sentences: what it is and how to style it. Be specific about fabric, fit, and occasion."
}`,
          },
        ],
      }],
    }),
  })

  if (!upstream.ok) {
    return new Response(await upstream.text(), { status: upstream.status })
  }

  const data = await upstream.json() as { content?: Array<{ text?: string }> }
  const raw = data.content?.[0]?.text?.trim() ?? ''

  let parsed: Record<string, unknown>
  try {
    const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? raw
    parsed = JSON.parse(jsonStr)
  } catch {
    return new Response(JSON.stringify({ error: 'parse-error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }

  // Sanitize — only allow known values to avoid injecting garbage into the engine
  const result = {
    suggestedName: typeof parsed.suggestedName === 'string' ? parsed.suggestedName.slice(0, 80) : '',
    vibes: Array.isArray(parsed.vibes) ? (parsed.vibes as string[]).filter(v => VALID_VIBES.includes(v)) : [],
    colors: Array.isArray(parsed.colors) ? (parsed.colors as string[]).filter(c => VALID_COLORS.includes(c)) : [],
    description: typeof parsed.description === 'string' ? parsed.description.slice(0, 400) : '',
  }

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
}
