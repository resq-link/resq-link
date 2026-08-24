"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardPlus, MessageSquareMore, Plus, Radio, Send, Settings2, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createSmsQuickReply,
  defaultSmsQuickReplies,
  deleteSmsQuickReply,
  subscribeToSmsGatewaySettings,
  subscribeToSmsIntakes,
  subscribeToSmsMessages,
  subscribeToSmsQuickReplies,
  type SmsGatewaySettings,
  type SmsIntake,
  type SmsIntakeStatus,
  type SmsMessage,
  type SmsQuickReply,
} from "@packages/firebase";
import SmsGatewaySettingsModal from "@/components/SmsGatewaySettingsModal";

const STATUS_COPY: Record<SmsIntakeStatus, { label: string; className: string }> = {
  untriaged: { label: "Needs triage", className: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
  triaged: { label: "Triaged", className: "bg-sky-500/15 text-sky-200 ring-sky-400/30" },
  closed: { label: "Closed", className: "bg-slate-700/70 text-slate-300 ring-slate-600" },
};

function asDate(value: SmsMessage["createdAt"] | SmsIntake["updatedAt"]) {
  if (!value) return null;
  return value instanceof Date ? value : value.toDate();
}

function formatDate(value: SmsMessage["createdAt"] | SmsIntake["updatedAt"]) {
  const date = asDate(value);
  if (!date) return "Just now";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(date);
}

function SmsWorkspace() {
  const { user } = useAuth();
  const [intakes, setIntakes] = useState<SmsIntake[]>([]);
  const [selected, setSelected] = useState<SmsIntake | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<SmsQuickReply[]>([]);
  const [gatewaySettings, setGatewaySettings] = useState<SmsGatewaySettings | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPromptManagerOpen, setIsPromptManagerOpen] = useState(false);
  const [newPromptLabel, setNewPromptLabel] = useState("");
  const [newPromptText, setNewPromptText] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<SmsIntakeStatus | "all">("untriaged");
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const functionsBaseUrl = process.env.NEXT_PUBLIC_SMS_FUNCTIONS_BASE_URL?.replace(/\/$/, "");

  useEffect(() => subscribeToSmsIntakes((next) => {
    setIntakes(next);
    setSelected((current) => next.find((item) => item.id === current?.id) ?? next[0] ?? null);
  }), []);
  useEffect(() => selected ? subscribeToSmsMessages(selected.threadId, setMessages) : undefined, [selected?.threadId]);
  useEffect(() => subscribeToSmsQuickReplies(setQuickReplies), []);
  useEffect(() => subscribeToSmsGatewaySettings(setGatewaySettings), []);

  const visibleIntakes = useMemo(() => filter === "all" ? intakes : intakes.filter((item) => item.status === filter), [filter, intakes]);
  const counts = useMemo(() => ({ all: intakes.length, untriaged: intakes.filter((item) => item.status === "untriaged").length, triaged: intakes.filter((item) => item.status === "triaged").length, closed: intakes.filter((item) => item.status === "closed").length }), [intakes]);
  const QUICK_REPLIES = quickReplies.length ? quickReplies.map((reply) => reply.text) : defaultSmsQuickReplies.map((reply) => reply.text);
  const incidentHref = useMemo(() => !selected ? "/command-center/intake" : `/command-center/intake?${new URLSearchParams({ source: "sms", callerContact: selected.phoneNumber, description: selected.latestMessage, smsThreadId: selected.threadId })}`, [selected]);

  async function callFunction(path: "sendSms" | "updateSmsIntake", payload: Record<string, string>) {
    if (!user) throw new Error("Authentication required.");
    const token = await user.getIdToken();

    // Use Cloud Function URL if available, otherwise use Next.js API routes directly
    const url = functionsBaseUrl
      ? `${functionsBaseUrl}/${path}`
      : path === "sendSms"
      ? "/api/command-center/sms/send"
      : "/api/command-center/sms/update-intake";

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error ?? "Unable to complete the SMS action.");
    }
  }

  async function send() {
    if (!selected || !body.trim()) return;
    setSending(true); setError(null);
    try { await callFunction("sendSms", { threadId: selected.threadId, phoneNumber: selected.phoneNumber, body: body.trim() }); setBody(""); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Unable to send SMS."); }
    finally { setSending(false); }
  }

  async function updateStatus(status: SmsIntakeStatus) {
    if (!selected) return;
    setUpdating(true); setError(null);
    try { await callFunction("updateSmsIntake", { threadId: selected.threadId, status }); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Unable to update the intake."); }
    finally { setUpdating(false); }
  }

  async function addPrompt() {
    const text = newPromptText.trim();
    if (!text) return;
    await createSmsQuickReply({ label: newPromptLabel.trim() || "Quick reply", text, sortOrder: Date.now() });
    setNewPromptLabel(""); setNewPromptText("");
  }

  async function seedDefaultPrompts() {
    await Promise.all(defaultSmsQuickReplies.map((prompt) => createSmsQuickReply(prompt)));
  }

  const gatewayStatus: "connected" | "disconnected" | "error" | "unconfigured" =
    gatewaySettings?.status ?? (gatewaySettings?.gatewayBaseUrl ? "disconnected" : "unconfigured");
  const gatewayStatusCopy = {
    connected: { label: "Gateway connected", dot: "bg-emerald-400" },
    disconnected: { label: "Gateway unreachable", dot: "bg-amber-400" },
    error: { label: "Gateway error", dot: "bg-red-400" },
    unconfigured: { label: "Gateway not configured", dot: "bg-slate-500" },
  }[gatewayStatus];

  return <div className="flex min-h-0 flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-400">Operations / civilian communications</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">SMS Intake</h1>
        <p className="mt-1 text-sm text-slate-400">Triage civilian reports, gather essentials, and escalate verified emergencies to incident intake.</p>
      </div>
      <button
        type="button"
        onClick={() => setIsSettingsModalOpen(true)}
        className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs text-slate-300 hover:border-primary-500/50 hover:bg-slate-900 transition-colors shadow-sm"
        title="Click to manage Android SMS Gateway settings"
      >
        <span className={`h-2 w-2 rounded-full ${gatewayStatusCopy.dot} animate-pulse`} />
        <span>{gatewayStatusCopy.label}</span>
        <Radio size={13} className="text-primary-400 ml-1" />
      </button>
    </header>

    <div className="flex justify-end gap-2">
      <button
        onClick={() => setIsSettingsModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-primary-500/70 hover:text-primary-200 transition-colors"
      >
        <Radio size={16} />SMS Gateway Settings
      </button>
      <button
        onClick={() => setIsPromptManagerOpen((open) => !open)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-primary-500/70 hover:text-primary-200 transition-colors"
      >
        <Settings2 size={16} />Manage SMS prompts
      </button>
    </div>

    {isPromptManagerOpen && <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-100">Reusable SMS prompts</h2><p className="mt-1 text-sm text-slate-400">Changes are saved for all dispatchers immediately.</p></div><button onClick={() => setIsPromptManagerOpen(false)} className="text-sm text-slate-400 hover:text-slate-100">Close</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[14rem_minmax(0,1fr)_auto]"><input value={newPromptLabel} onChange={(event) => setNewPromptLabel(event.target.value)} placeholder="Label (e.g. Request location)" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /><input value={newPromptText} onChange={(event) => setNewPromptText(event.target.value)} placeholder="Prompt text" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100" /><button onClick={addPrompt} disabled={!newPromptText.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} />Add prompt</button></div>{!quickReplies.length && <button onClick={seedDefaultPrompts} className="mt-3 text-sm font-medium text-primary-300 hover:text-primary-200">Save the three starter prompts to this workspace</button>}<div className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">{quickReplies.map((reply) => <div key={reply.id} className="flex items-center gap-3 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-200">{reply.label}</p><p className="mt-1 truncate text-xs text-slate-400">{reply.text}</p></div><button onClick={() => deleteSmsQuickReply(reply.id)} aria-label={`Delete ${reply.label}`} className="rounded p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={16} /></button></div>)}</div></section>}
    <div className="grid min-h-0 flex-1 gap-4 2xl:grid-cols-[21rem_minmax(0,1fr)_19rem]">
      <aside className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70"><div className="border-b border-slate-800 p-4"><div className="flex items-center justify-between"><h2 className="font-semibold text-slate-100">Queue</h2><span className="text-xs text-slate-500">{counts.untriaged} need review</span></div><div className="mt-3 grid grid-cols-2 gap-1">{(["untriaged", "triaged", "closed", "all"] as const).map((status) => <button key={status} onClick={() => setFilter(status)} className={`rounded-md px-2 py-1.5 text-xs font-medium transition ${filter === status ? "bg-primary-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>{status === "all" ? "All" : STATUS_COPY[status].label} ({counts[status]})</button>)}</div></div><div className="max-h-[65vh] overflow-y-auto">{visibleIntakes.map((item) => <button key={item.id} onClick={() => setSelected(item)} className={`block w-full border-b border-slate-800 px-4 py-3.5 text-left transition hover:bg-slate-900 ${selected?.id === item.id ? "bg-slate-900" : ""}`}><div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-100">{item.phoneNumber}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${STATUS_COPY[item.status].className}`}>{STATUS_COPY[item.status].label}</span></div><p className="mt-1.5 line-clamp-2 text-sm text-slate-400">{item.latestMessage}</p><p className="mt-2 text-[11px] text-slate-500">{formatDate(item.updatedAt)}</p></button>)}{!visibleIntakes.length && <p className="p-5 text-sm text-slate-500">No conversations in this queue.</p>}</div></aside>
      <main className="flex min-h-[34rem] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">{selected ? <><div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4"><div><h2 className="font-semibold text-slate-100">{selected.phoneNumber}</h2><p className="mt-1 text-xs text-slate-500">Civilian SMS conversation</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_COPY[selected.status].className}`}>{STATUS_COPY[selected.status].label}</span></div><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.map((message) => <div key={message.id} className={`max-w-[82%] rounded-xl px-3.5 py-2.5 ${message.direction === "outbound" ? "ml-auto bg-primary-600 text-white" : "bg-slate-800 text-slate-100"}`}><p className="whitespace-pre-wrap text-sm leading-5">{message.body}</p><p className={`mt-1.5 text-[10px] ${message.direction === "outbound" ? "text-primary-100" : "text-slate-500"}`}>{formatDate(message.createdAt)} · {message.status}</p></div>)}{!messages.length && <p className="text-sm text-slate-500">Loading conversation…</p>}</div><div className="border-t border-slate-800 p-4"><div className="mb-2 flex flex-wrap gap-2">{QUICK_REPLIES.map((reply, index) => <button key={reply} onClick={() => setBody(reply)} className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:border-primary-500/70 hover:text-primary-200">Prompt {index + 1}</button>)}</div><textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={sending} maxLength={480} placeholder="Reply to the civilian…" className="min-h-24 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-primary-500 disabled:opacity-50" />{error && <p className="mt-2 text-sm text-red-300">{error}</p>}<div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">{body.length}/480</span><button onClick={send} disabled={!body.trim() || sending} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"><Send size={15} />{sending ? "Sending…" : "Send SMS"}</button></div></div></> : <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center"><MessageSquareMore className="text-slate-600" size={36} /><p className="text-sm text-slate-400">Choose a conversation to begin triage.</p></div>}</main>
      <aside className="space-y-4"><section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><div className="flex items-center gap-2"><ShieldAlert size={17} className="text-amber-300" /><h2 className="font-semibold text-slate-100">Triage checklist</h2></div><p className="mt-2 text-sm leading-5 text-slate-400">Before dispatch, confirm the location, what happened, people at risk, and a safe callback number.</p><ul className="mt-3 space-y-2 text-sm text-slate-300"><li>• Exact location / landmark</li><li>• Emergency type and severity</li><li>• Injuries or immediate danger</li><li>• Caller name and callback</li></ul></section><section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><h2 className="font-semibold text-slate-100">Disposition</h2><p className="mt-1 text-sm text-slate-400">Record the outcome so the queue reflects current work.</p><div className="mt-4 space-y-2"><Link href={incidentHref} onClick={() => updateStatus("triaged")} className={`flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 ${!selected ? "pointer-events-none opacity-50" : ""}`}><ClipboardPlus size={16} />Create incident</Link><button onClick={() => updateStatus("triaged")} disabled={!selected || updating} className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/40 px-3 py-2.5 text-sm font-medium text-sky-200 hover:bg-sky-500/10 disabled:opacity-50"><CheckCircle2 size={16} />Mark triaged</button><button onClick={() => updateStatus("closed")} disabled={!selected || updating} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"><XCircle size={16} />Close conversation</button></div></section></aside>
    </div>
    <SmsGatewaySettingsModal
      isOpen={isSettingsModalOpen}
      onClose={() => setIsSettingsModalOpen(false)}
    />
  </div>;
}

export default function SmsPage() { return <SmsWorkspace />; }
