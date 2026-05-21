'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, ChevronDown, Loader2, MessageCircle, Plus, Send, Users, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  createDirectChat,
  createGroupChat,
  getMessagingParticipants,
  sendChatMessage,
  subscribeToChatMessages,
  subscribeToChatThreads,
  type ChatMessageRecord,
  type ChatParticipant,
  type ChatThreadRecord,
} from '@packages/firebase'

const toMillis = (value: ChatMessageRecord['createdAt'] | ChatThreadRecord['updatedAt']) => {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'object' && 'toDate' in value) return value.toDate().getTime()
  return 0
}

function getThreadLabel(thread: ChatThreadRecord, currentUserId: string) {
  const participantNames = thread.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => thread.participantNames[id])
    .filter(Boolean)

  if (thread.type === 'group') {
    const title = thread.title?.trim()
    if (title && title.toLowerCase() !== 'group chat') {
      return title
    }
    return participantNames.length > 0 ? participantNames.join(', ') : 'Group chat'
  }

  const otherId = thread.participantIds.find((id) => id !== currentUserId)
  return otherId ? thread.participantNames[otherId] || 'Direct chat' : 'Direct chat'
}

function getThreadSubtitle(thread: ChatThreadRecord, currentUserId: string) {
  const participantNames = thread.participantIds
    .filter((id) => id !== currentUserId)
    .map((id) => thread.participantNames[id])
    .filter(Boolean)

  if (thread.type === 'group') {
    return participantNames.length > 0 ? participantNames.join(', ') : `${thread.participantIds.length} participants`
  }

  return thread.lastMessageText || 'No messages yet'
}

function getRoleLabel(role: ChatParticipant['role']) {
  if (role === 'command_center') return 'Command'
  if (role === 'dispatcher') return 'Dispatcher'
  return 'Responder'
}

export default function OperationalChatWidget() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [threads, setThreads] = useState<ChatThreadRecord[]>([])
  const [messages, setMessages] = useState<ChatMessageRecord[]>([])
  const [participants, setParticipants] = useState<ChatParticipant[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([])
  const [groupTitle, setGroupTitle] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!user) return
    const unsubscribe = subscribeToChatThreads((items) => {
      setThreads(items)
      setSelectedThreadId((current) => current || items[0]?.id || null)
    })
    return unsubscribe
  }, [user])

  useEffect(() => {
    if (!user || !isOpen) return
    getMessagingParticipants()
      .then((items) => setParticipants(items.filter((item) => item.uid !== user.uid)))
      .catch((err) => {
        console.error('Failed to load messaging participants:', err)
        setParticipants([])
      })
  }, [isOpen, user])

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([])
      return
    }
    return subscribeToChatMessages(selectedThreadId, setMessages)
  }, [selectedThreadId])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [isOpen, messages, selectedThreadId])

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) || null,
    [selectedThreadId, threads]
  )
  const responderOptions = participants.filter((participant) => participant.role === 'responder')
  const dispatcherOptions = participants.filter((participant) => participant.role !== 'responder')

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId]
    )
  }

  const handleCreateDirect = async (participantId: string) => {
    setIsSaving(true)
    setError(null)
    try {
      const thread = await createDirectChat(participantId)
      setSelectedThreadId(thread.id || null)
      setIsComposerOpen(false)
      setSelectedParticipantIds([])
    } catch (err: any) {
      setError(err.message || 'Failed to create chat.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateGroup = async () => {
    if (selectedParticipantIds.length === 0) {
      setError('Select at least one responder for the group.')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const thread = await createGroupChat(groupTitle, selectedParticipantIds)
      setSelectedThreadId(thread.id || null)
      setIsComposerOpen(false)
      setSelectedParticipantIds([])
      setGroupTitle('')
    } catch (err: any) {
      setError(err.message || 'Failed to create group chat.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedThreadId || !draft.trim()) return
    const nextDraft = draft
    setDraft('')
    setError(null)
    try {
      await sendChatMessage(selectedThreadId, nextDraft)
    } catch (err: any) {
      setDraft(nextDraft)
      setError(err.message || 'Failed to send message.')
    }
  }

  if (!user || pathname === '/login') {
    return null
  }

  return (
    <>
      {isOpen && (
        <section
          className="fixed bottom-40 right-4 z-50 grid h-[min(680px,calc(100vh-11rem))] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl sm:right-6 md:grid-cols-[300px_1fr]"
          role="dialog"
          aria-label="Operational messaging"
        >
          <aside className="flex min-h-0 flex-col border-b border-slate-800 md:border-b-0 md:border-r">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 p-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">Messages</h2>
                <p className="mt-1 text-xs text-slate-500">Dispatcher to responder comms</p>
              </div>
              <button
                type="button"
                onClick={() => setIsComposerOpen((current) => !current)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-500"
                aria-label="Create chat"
              >
                <Plus size={18} aria-hidden />
              </button>
            </div>

            {isComposerOpen && (
              <div className="space-y-3 border-b border-slate-800 bg-slate-950 p-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Direct responder chat</label>
                  <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1">
                    {responderOptions.map((participant) => (
                      <button
                        key={participant.uid}
                        type="button"
                        onClick={() => void handleCreateDirect(participant.uid)}
                        disabled={isSaving}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-200 hover:border-primary-500/50 disabled:opacity-60"
                      >
                        <span className="truncate">{participant.name}</span>
                        <span className="text-[10px] text-slate-500">{getRoleLabel(participant.role)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Group chat</label>
                  <input
                    value={groupTitle}
                    onChange={(event) => setGroupTitle(event.target.value)}
                    placeholder="Group title"
                    className="h-9 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 outline-none focus:border-primary-500"
                  />
                  <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                    {[...dispatcherOptions, ...responderOptions].map((participant) => {
                      const selected = selectedParticipantIds.includes(participant.uid)
                      return (
                        <button
                          key={participant.uid}
                          type="button"
                          onClick={() => toggleParticipant(participant.uid)}
                          className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs ${
                            selected
                              ? 'border-primary-500/50 bg-primary-500/10 text-primary-100'
                              : 'border-slate-800 bg-slate-900 text-slate-200'
                          }`}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded border border-current">
                            {selected && <Check size={12} aria-hidden />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{participant.name}</span>
                          <span className="text-[10px] opacity-70">{getRoleLabel(participant.role)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCreateGroup()}
                    disabled={isSaving || selectedParticipantIds.length === 0}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-xs font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Users size={14} />}
                    Create group
                  </button>
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {threads.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500">No chats yet.</p>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id || null)}
                    className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition-colors ${
                      selectedThreadId === thread.id ? 'bg-primary-500/15 text-primary-100' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{getThreadLabel(thread, user.uid)}</span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-500">{thread.type}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{getThreadSubtitle(thread, user.uid)}</p>
                    {thread.lastMessageText && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-600">{thread.lastMessageText}</p>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 p-4">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-100">
                  {selectedThread ? getThreadLabel(selectedThread, user.uid) : 'Select a chat'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedThread ? `${selectedThread.participantIds.length} participant(s)` : 'Operational messages'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close messages"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {!selectedThread ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Choose a chat to begin.</div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No messages yet.</div>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === user.uid
                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${mine ? 'bg-primary-600 text-white' : 'border border-slate-800 bg-slate-900 text-slate-200'}`}>
                        {!mine && <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{message.senderName}</p>}
                        <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-primary-100/70' : 'text-slate-600'}`}>
                          {toMillis(message.createdAt) ? new Date(toMillis(message.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-200">{error}</div>}

            <form onSubmit={handleSend} className="border-t border-slate-800 bg-slate-900/80 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={2}
                  disabled={!selectedThread}
                  placeholder={selectedThread ? 'Type an operational message...' : 'Select a chat first'}
                  className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-primary-400 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!selectedThread || !draft.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                  aria-label="Send message"
                >
                  <Send size={18} aria-hidden />
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed bottom-24 right-4 z-50 flex h-14 items-center gap-3 rounded-2xl border border-sky-400/30 bg-slate-900/95 px-4 text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-800 sm:right-6"
        aria-label={isOpen ? 'Collapse operational messages' : 'Open operational messages'}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950">
          {isOpen ? <ChevronDown size={20} aria-hidden /> : <MessageCircle size={20} aria-hidden />}
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="text-xs font-black uppercase tracking-[0.18em]">Messages</span>
          <span className="mt-1 text-[10px] font-semibold text-slate-500">Ops chat</span>
        </span>
      </button>
    </>
  )
}
