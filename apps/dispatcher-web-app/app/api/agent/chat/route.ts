import { NextRequest, NextResponse } from 'next/server'

type AgentMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AgentContext = {
  page?: string
  incidents?: unknown[]
  resources?: unknown[]
  teams?: unknown[]
  metrics?: Record<string, unknown>
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-2.5-flash'

function getConfiguredModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim().replace(/^['"]|['"]$/g, '')
  return configured || DEFAULT_MODEL
}

function normalizeMessages(value: unknown): AgentMessage[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is AgentMessage => {
      return (
        item &&
        typeof item === 'object' &&
        ('role' in item) &&
        (item.role === 'user' || item.role === 'assistant') &&
        ('content' in item) &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
      )
    })
    .slice(-10)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 4000),
    }))
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''

  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text()
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return {
      error: {
        message: text.slice(0, 500),
      },
    }
  }
}

function buildSystemInstruction(context: AgentContext): string {
  const contextJson = JSON.stringify(context ?? {}, null, 2).slice(0, 16000)

  return [
    'You are RESQ Assistant, an advisory AI for a rescue dispatch command center in Tuguegarao.',
    'Your job is to synthesize incident, resource, and team data into concise operational recommendations.',
    'Do not claim to dispatch, assign, resolve, or modify any record. You only advise the human dispatcher.',
    'Prioritize life safety, high priority incidents, unresolved cases, resource availability, and repeated hotspots.',
    'If data is missing or stale, say what is missing instead of guessing.',
    'Use clear sections when useful: Summary, Risks, Recommendations, Data used.',
    'Keep answers brief unless the user asks for a detailed report.',
    '',
    'Current application context:',
    contextJson,
  ].join('\n')
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY on the server.' },
        { status: 500 }
      )
    }

    const { isCommandCenterAccount, verifyIdToken } = await import('@packages/firebase/admin')
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const decoded = await verifyIdToken(token)
    const isCommandCenter = await isCommandCenterAccount(decoded.uid)
    if (!isCommandCenter) {
      return NextResponse.json({ error: 'Forbidden: command center access required' }, { status: 403 })
    }

    const body = await request.json()
    const messages = normalizeMessages(body.messages)
    const context = (body.context && typeof body.context === 'object' ? body.context : {}) as AgentContext
    const latestUserMessage = messages.filter((message) => message.role === 'user').at(-1)

    if (!latestUserMessage) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const model = getConfiguredModel()
    const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemInstruction(context) }],
        },
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 900,
        },
      }),
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
      const message = payload?.error?.message || `Gemini request failed with HTTP ${response.status}.`
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const reply = extractGeminiText(payload)
    if (!reply) {
      return NextResponse.json(
        { error: 'Gemini returned an empty response.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ reply })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown agent error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
