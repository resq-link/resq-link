'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Shield, User, Clock, CheckCheck, Radio } from 'lucide-react';
import {
  subscribeToIncidentChat,
  sendIncidentChatMessage,
  type IncidentChatMessageRecord,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface IncidentMessagingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  incidentId: string;
  referenceNumber?: string;
  civilianName?: string;
  civilianPhone?: string;
}

const QUICK_REPLIES = [
  'Help is on the way. Please stay in a safe location.',
  'Responders have been dispatched to your area.',
  'Can you describe any visible landmarks near you?',
  'Is anyone injured or in need of immediate medical attention?',
  'Please keep your line open and alert.',
];

export default function IncidentMessagingDrawer({
  isOpen,
  onClose,
  incidentId,
  referenceNumber = 'INCIDENT',
  civilianName = 'Citizen',
  civilianPhone,
}: IncidentMessagingDrawerProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<IncidentChatMessageRecord[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !incidentId) return;

    const unsubscribe = subscribeToIncidentChat(incidentId, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [isOpen, incidentId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !incidentId || isSending) return;

    setIsSending(true);
    try {
      await sendIncidentChatMessage(incidentId, {
        senderId: user?.uid,
        senderName: user?.displayName || user?.email || 'Dispatcher',
        senderRole: 'dispatcher',
        text,
      });
      if (!textToSend) {
        setInputText('');
      }
    } catch (error) {
      console.error('[IncidentMessagingDrawer] Send error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const formatMessageTime = (date?: Date | any) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Drawer Header */}
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-tight">
                    {referenceNumber} Chat
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Citizen: <span className="font-semibold text-slate-200">{civilianName}</span>
                  {civilianPhone && ` • ${civilianPhone}`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Replies Strip */}
          <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Quick:
            </span>
            {QUICK_REPLIES.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleSend(reply)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-slate-300 transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <MessageSquare className="w-10 h-10 mb-2 text-slate-700" />
                <p className="text-xs font-semibold text-slate-400">No messages yet</p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                  Send a message to update the reporting citizen or receive real-time updates from them.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isDispatcher = msg.senderRole === 'dispatcher' || msg.senderRole === 'command_center';
                const isResponder = msg.senderRole === 'responder';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isDispatcher ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDispatcher
                            ? 'text-sky-400'
                            : isResponder
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {msg.senderName} ({msg.senderRole})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md leading-relaxed ${
                        isDispatcher
                          ? 'bg-sky-600 text-white rounded-br-none'
                          : isResponder
                          ? 'bg-amber-950/80 border border-amber-800 text-amber-100 rounded-bl-none'
                          : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700/80'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 border-t border-slate-800 bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message to citizen..."
                className="flex-1 h-11 px-4 rounded-xl bg-slate-950 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isSending}
                className="h-11 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-all shadow-md shadow-sky-900/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
