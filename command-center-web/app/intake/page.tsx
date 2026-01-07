'use client'

import { useMemo, useState } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'

const mockChannels = [
  {
    id: 'msg-201',
    type: 'SMS',
    from: '+63 912 345 6789',
    time: '09:18',
    text: 'May sunog sa 3rd floor, smoke is thick. We need help now.',
  },
  {
    id: 'call-203',
    type: 'Call',
    from: 'Barangay Hall',
    time: '09:23',
    text: 'Caller reports a motorcycle accident with two injured near Riverside bridge.',
  },
  {
    id: 'msg-207',
    type: 'SMS',
    from: '+63 998 111 2244',
    time: '09:31',
    text: 'Flood rising fast on North Gate street, kids trapped in the house.',
  },
]

const responderOptions = [
  { id: 'ambulance', label: 'Ambulance Unit' },
  { id: 'fire', label: 'Fire Response' },
  { id: 'police', label: 'Police Unit' },
  { id: 'rescue', label: 'Rescue Team' },
  { id: 'coast', label: 'Coast Guard' },
]

const incidentTypes = [
  'Fire',
  'Medical Emergency',
  'Traffic Accident',
  'Crime',
  'Flood',
  'Other',
]

const priorityLevels = ['Low', 'Medium', 'High', 'Critical']

const keywordRules = [
  { match: ['fire', 'smoke', 'sunog'], type: 'Fire', priority: 'Critical', responders: ['fire', 'ambulance'] },
  { match: ['accident', 'crash', 'collision', 'bangga'], type: 'Traffic Accident', priority: 'High', responders: ['ambulance', 'police'] },
  { match: ['injured', 'unconscious', 'bleeding', 'medical'], type: 'Medical Emergency', priority: 'High', responders: ['ambulance'] },
  { match: ['flood', 'water', 'evacuate'], type: 'Flood', priority: 'Critical', responders: ['rescue', 'coast'] },
  { match: ['crime', 'theft', 'robbery', 'attack'], type: 'Crime', priority: 'High', responders: ['police'] },
]

const getAiSuggestion = (text: string) => {
  const lower = text.toLowerCase()
  for (const rule of keywordRules) {
    if (rule.match.some((keyword) => lower.includes(keyword))) {
      return rule
    }
  }
  return { type: 'Other', priority: 'Medium', responders: ['rescue'] }
}

export default function IntakePage() {
  const [callerName, setCallerName] = useState('')
  const [callerNumber, setCallerNumber] = useState('')
  const [location, setLocation] = useState('')
  const [incidentType, setIncidentType] = useState('Other')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState('')
  const [responderSelection, setResponderSelection] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(mockChannels[0]?.id || null)

  const selectedChannel = useMemo(
    () => mockChannels.find((channel) => channel.id === selectedChannelId) || null,
    [selectedChannelId]
  )

  const aiSuggestion = useMemo(() => getAiSuggestion(description || selectedChannel?.text || ''), [
    description,
    selectedChannel,
  ])

  const aiSummary = useMemo(() => {
    const source = description || selectedChannel?.text || 'No caller summary provided.'
    return source.length > 140 ? `${source.slice(0, 140)}...` : source
  }, [description, selectedChannel])

  const applyAi = () => {
    setIncidentType(aiSuggestion.type)
    setPriority(aiSuggestion.priority)
    setResponderSelection(aiSuggestion.responders)
    if (!description && selectedChannel?.text) {
      setDescription(selectedChannel.text)
    }
  }

  const toggleResponder = (id: string) => {
    setResponderSelection((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/30">
          <p className="text-xs uppercase tracking-[0.3em] text-secondary-300">Dispatcher Intake</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">AI-assisted Incident Intake</h1>
          <p className="mt-2 text-sm text-slate-400">
            Draft dispatch records while the AI triages incoming calls and messages.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_1.5fr_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Incoming Channels</h2>
              <span className="text-xs text-slate-400">Live feed</span>
            </div>
            <div className="mt-6 space-y-4">
              {mockChannels.map((channel) => (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => setSelectedChannelId(channel.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedChannelId === channel.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.2em] text-secondary-300">{channel.type}</span>
                    <span className="text-xs text-slate-500">{channel.time}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{channel.from}</p>
                  <p className="mt-2 text-xs text-slate-400">{channel.text}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Incident Intake Form</h2>
              <span className="text-xs text-slate-400">Mock dispatcher view</span>
            </div>
            <form className="mt-6 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Name</label>
                  <input
                    value={callerName}
                    onChange={(event) => setCallerName(event.target.value)}
                    placeholder="e.g., Maria Santos"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Caller Number</label>
                  <input
                    value={callerNumber}
                    onChange={(event) => setCallerNumber(event.target.value)}
                    placeholder="+63 900 000 0000"
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</label>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Street, barangay, landmark"
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Type</label>
                  <select
                    value={incidentType}
                    onChange={(event) => setIncidentType(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {incidentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</label>
                  <select
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {priorityLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Incident Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={5}
                  placeholder="Summarize what happened, injuries, hazards..."
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned Responders</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {responderOptions.map((responder) => (
                    <button
                      key={responder.id}
                      type="button"
                      onClick={() => toggleResponder(responder.id)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                        responderSelection.includes(responder.id)
                          ? 'border-primary-500 bg-primary-500/20 text-primary-200'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {responder.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Dispatcher Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Optional notes for responders."
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-500"
                >
                  Dispatch (Mock)
                </button>
                <button
                  type="reset"
                  className="rounded-lg border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500"
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">AI Assist</h2>
              <span className="text-xs text-slate-400">Mock analysis</span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Signal Summary</p>
                <p className="mt-2 text-sm text-slate-200">{aiSummary}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Suggested Type</p>
                <p className="mt-2 text-sm font-semibold text-secondary-300">{aiSuggestion.type}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Suggested Priority</p>
                <p className="mt-2 text-sm font-semibold text-yellow-200">{aiSuggestion.priority}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recommended Responders</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiSuggestion.responders.map((responder) => (
                    <span
                      key={responder}
                      className="rounded-full border border-secondary-500/40 bg-secondary-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-secondary-200"
                    >
                      {responder}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={applyAi}
                className="w-full rounded-lg border border-secondary-500/40 bg-secondary-500/10 px-4 py-2 text-sm font-semibold text-secondary-200 hover:bg-secondary-500/20"
              >
                Apply AI Suggestions
              </button>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AI Checklist</p>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li>Verify caller location and landmark reference.</li>
                  <li>Confirm injuries and hazards for responders.</li>
                  <li>Notify command center if escalation needed.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ProtectedRoute>
  )
}
