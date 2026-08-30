'use client';

import { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, Radio, Users, Clock, ChevronRight, X, Volume2 } from 'lucide-react';
import {
  subscribeToDispatcherCallQueue,
  acceptIncidentCallSession,
  type IncidentCallSession,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ActiveCallModal from './ActiveCallModal';

export default function DispatcherCallQueueSidebar() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<IncidentCallSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCallSession, setActiveCallSession] = useState<IncidentCallSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToDispatcherCallQueue((calls) => {
      const uniqueByCaller = new Map<string, IncidentCallSession>();
      for (const call of calls) {
        const key = call.callerUserId || call.id || '';
        if (!key || uniqueByCaller.has(key)) continue;
        uniqueByCaller.set(key, call);
      }
      setQueue(Array.from(uniqueByCaller.values()));
    });

    return () => unsubscribe();
  }, [user]);

  const ringingCount = queue.filter((c) => c.status === 'ringing' || c.status === 'queued').length;
  const connectedCount = queue.filter((c) => c.status === 'connected' || c.status === 'accepted').length;

  const handlePickUp = async (call: IncidentCallSession) => {
    if (call.id && (call.status === 'ringing' || call.status === 'queued')) {
      await acceptIncidentCallSession(call.id, {
        uid: user?.uid,
        name: user?.displayName || user?.email || 'Dispatcher',
      }).catch(() => undefined);
    }
    setActiveCallSession(call);
    setIsModalOpen(true);
  };

  const formatWaitTime = (createdAt?: Date | null) => {
    if (!createdAt) return 'Just now';
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} wait`;
  };

  return (
    <>
      {/* Floating Trigger Button on left edge */}
      <div className="fixed bottom-24 left-4 z-40">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border font-bold text-xs shadow-2xl transition-all ${
            ringingCount > 0
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white animate-bounce'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-300'
          }`}
          title="Emergency Voice Call Queue"
        >
          <PhoneIncoming className={`w-4 h-4 ${ringingCount > 0 ? 'animate-pulse' : 'text-slate-400'}`} />
          <span className="uppercase tracking-wider">Call Queue</span>
          {ringingCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-white text-emerald-700 font-black text-[10px]">
              {ringingCount}
            </span>
          ) : queue.length > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px]">
              {queue.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Slide-out Queue Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-80 bg-slate-900/98 border-r border-slate-700 shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-left duration-300">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center">
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-100">Live Call Center</h3>
                <p className="text-[10px] text-slate-400">
                  {ringingCount} waiting • {connectedCount} active
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Queue List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {queue.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <Phone className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-400">No active or queued calls</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Incoming 1-click calls and incident requests will appear here in real time.
                </p>
              </div>
            ) : (
              queue.map((call) => {
                const isRinging = call.status === 'ringing' || call.status === 'queued';
                const isDirect = call.callType === 'direct_emergency';

                return (
                  <div
                    key={call.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isRinging
                        ? 'bg-emerald-950/30 border-emerald-600/60 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-800/60 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRinging ? 'bg-emerald-400 animate-ping' : 'bg-sky-400'
                            }`}
                          />
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {isDirect ? '1-Click SOS' : call.incidentReferenceNumber || 'Incident'}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-100 uppercase tracking-tight truncate mt-1">
                          {call.callerName || 'Citizen in Need'}
                        </h4>
                        {call.callerPhone && (
                          <p className="text-[11px] text-slate-400 truncate">{call.callerPhone}</p>
                        )}
                        {call.incidentLocationText && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            📍 {call.incidentLocationText}
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatWaitTime(call.createdAt as Date | null)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handlePickUp(call)}
                        className={`flex-1 h-8 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                          isRinging
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        <Phone className="w-3 h-3" />
                        {isRinging ? 'Answer' : 'Rejoin Call'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      <ActiveCallModal
        session={activeCallSession}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveCallSession(null);
        }}
      />
    </>
  );
}
