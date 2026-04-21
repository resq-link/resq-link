'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToIncidents,
  subscribeToResources,
  subscribeToTeams,
  type IncidentRecord,
  type ResourceRecord,
  type TeamRecord,
} from '@packages/firebase'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const starterPrompts = [
  'Summarize active and unresolved incidents.',
  'What should dispatch prioritize right now?',
  'Generate a concise shift report.',
  'Find high-risk patterns in the current records.',
]

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  }
}

function getTimestamp(value: IncidentRecord['createdAt'] | IncidentRecord['updatedAt']): number {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && 'toDate' in value) return value.toDate().getTime()
  return 0
}

function summarizeIncident(incident: IncidentRecord) {
  return {
    referenceNumber: incident.referenceNumber,
    category: incident.incidentCategory,
    subtype: incident.incidentSubtypeLabel,
    priority: incident.priority,
    status: incident.status,
    resolutionStatus: incident.resolutionStatus,
    location: incident.locationText,
    quadrant: incident.quadrant,
    teamOnDuty: incident.teamOnDuty,
    scheduleOfDuty: incident.scheduleOfDuty,
    incidentDate: incident.incidentDate,
    incidentTime: incident.incidentTime,
    requiresExternalAgency: incident.requiresExternalAgency,
    assignedAgencies: incident.assignedAgencies,
    assignedResourceCount: incident.assignedResourceIds?.length ?? 0,
  }
}

function summarizeResource(resource: ResourceRecord) {
  return {
    name: resource.name,
    code: resource.resourceCode,
    type: resource.type,
    agency: resource.agency,
    teamName: resource.teamName,
    status: resource.status,
    quadrant: resource.quadrant,
    isActive: resource.isActive,
  }
}

function summarizeTeam(team: TeamRecord) {
  return {
    code: team.code,
    label: team.label,
    isActive: team.isActive,
  }
}

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-black text-slate-100">{children}</strong>,
        ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        code: ({ children }) => (
          <code className="rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[0.85em] text-primary-200">
            {children}
          </code>
        ),
        h1: ({ children }) => <h3 className="mb-2 text-base font-black text-slate-100">{children}</h3>,
        h2: ({ children }) => <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-100">{children}</h3>,
        h3: ({ children }) => <h3 className="mb-2 text-sm font-black text-slate-100">{children}</h3>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

async function readAgentResponse(response: Response): Promise<any> {
  const text = await response.text()
  if (!text.trim()) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return {
      error: text.slice(0, 500),
    }
  }
}

export default function AgentAssistant() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      'I can summarize incidents, highlight risks, and draft operational recommendations from the current dispatcher data.'
    ),
  ])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user) return

    const unsubscribeIncidents = subscribeToIncidents(setIncidents, 300)
    const unsubscribeResources = subscribeToResources(setResources, 300)
    const unsubscribeTeams = subscribeToTeams(setTeams, 100)

    return () => {
      unsubscribeIncidents()
      unsubscribeResources()
      unsubscribeTeams()
    }
  }, [user])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages, isSending])

  const contextSnapshot = useMemo(() => {
    const activeStatuses = new Set(['new', 'awaiting_resources', 'liaison_pending', 'dispatched', 'enroute', 'on_scene', 'unresolved'])
    const activeIncidents = incidents.filter((incident) => activeStatuses.has(incident.status))
    const highRiskIncidents = incidents.filter((incident) => incident.priority === 'critical' || incident.priority === 'high')
    const availableResources = resources.filter((resource) => resource.status === 'available' && resource.isActive !== false)

    return {
      page: pathname,
      metrics: {
        totalIncidentsLoaded: incidents.length,
        activeIncidentCount: activeIncidents.length,
        highRiskIncidentCount: highRiskIncidents.length,
        availableResourceCount: availableResources.length,
        unavailableResourceCount: resources.length - availableResources.length,
        activeTeamCount: teams.filter((team) => team.isActive).length,
      },
      incidents: [...activeIncidents, ...highRiskIncidents]
        .sort((left, right) => getTimestamp(right.createdAt) - getTimestamp(left.createdAt))
        .filter((incident, index, list) => list.findIndex((item) => item.id === incident.id) === index)
        .slice(0, 40)
        .map(summarizeIncident),
      resources: resources.slice(0, 80).map(summarizeResource),
      teams: teams.map(summarizeTeam),
    }
  }, [incidents, pathname, resources, teams])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !user || isSending) return

    setError(null)
    setInput('')

    const userMessage = createMessage('user', trimmed)
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsSending(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          context: contextSnapshot,
        }),
      })

      const payload = await readAgentResponse(response)
      if (!response.ok) {
        throw new Error(payload?.error || 'Agent request failed.')
      }

      if (!payload?.reply) {
        throw new Error('Agent returned an empty response.')
      }

      setMessages((current) => [...current, createMessage('assistant', payload.reply)])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach the agent.'
      setError(message)
      setMessages((current) => [
        ...current,
        createMessage('assistant', `I could not complete that request: ${message}`),
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void sendMessage(input)
  }

  if (!user || pathname === '/login') {
    return null
  }

  return (
    <>
      {isOpen && (
        <section
          className="fixed bottom-24 right-4 z-50 flex h-[min(680px,calc(100vh-7rem))] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl sm:right-6"
          role="dialog"
          aria-label="RESQ Assistant chat"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-400/30 bg-primary-500/10 text-primary-300">
                <Bot size={22} aria-hidden />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">RESQ Assistant</h2>
                <p className="mt-1 text-xs text-slate-500">Advisory summaries and recommendations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              aria-label="Close assistant"
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          <div className="border-b border-slate-800 bg-slate-950/70 p-3">
            <div className="grid grid-cols-2 gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={isSending}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-left text-xs font-semibold text-slate-300 transition-colors hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'border border-slate-800 bg-slate-900 text-slate-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <AssistantMarkdown content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                  <Loader2 className="animate-spin" size={16} aria-hidden />
                  Thinking through current operations...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="border-t border-slate-800 bg-slate-900/80 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void sendMessage(input)
                  }
                }}
                rows={2}
                placeholder="Ask for a summary, recommendation, or report..."
                className="custom-scrollbar max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-primary-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                aria-label="Send message"
              >
                {isSending ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Send size={18} aria-hidden />}
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-5 right-4 z-50 flex h-14 items-center gap-3 rounded-2xl border border-primary-400/30 bg-slate-900/95 px-4 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:bg-slate-800 sm:right-6"
        aria-label={isOpen ? 'Collapse RESQ Assistant' : 'Open RESQ Assistant'}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-slate-950">
          {isOpen ? <ChevronDown size={20} aria-hidden /> : <Sparkles size={20} aria-hidden />}
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-xs font-black uppercase tracking-[0.18em]">RESQ AI</span>
          <span className="mt-1 text-[10px] font-semibold text-slate-500">
            <MessageSquareText className="mr-1 inline" size={11} aria-hidden />
            Ask assistant
          </span>
        </span>
      </button>
    </>
  )
}
