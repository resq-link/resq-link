'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Radio, ShieldAlert, X } from 'lucide-react';
import {
  subscribeToIncomingCallsForDispatcher,
  acceptIncidentCallSession,
  declineIncidentCallSession,
  type IncidentCallSession,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';
import ActiveCallModal from './ActiveCallModal';

export default function IncomingCallAlertBanner() {
  const { user } = useAuth();
  const [incomingCalls, setIncomingCalls] = useState<IncidentCallSession[]>([]);
  const [activeCallSession, setActiveCallSession] = useState<IncidentCallSession | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToIncomingCallsForDispatcher((calls) => {
      // Filter calls where caller is not current user and status is ringing/queued
      const ringing = calls.filter((c) => c.callerUserId !== user.uid && (c.status === 'ringing' || c.status === 'queued'));
      setIncomingCalls(ringing);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle sound chime on incoming call
  useEffect(() => {
    if (incomingCalls.length > 0 && !activeCallSession) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => undefined);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [incomingCalls.length, activeCallSession]);

  const currentCall = incomingCalls[0] || null;

  const handleAnswer = async (call: IncidentCallSession) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (call.id) {
      await acceptIncidentCallSession(call.id, {
        uid: user?.uid,
        name: user?.displayName || user?.email || 'Dispatcher',
      }).catch(() => undefined);
    }
    setActiveCallSession(call);
    setIsCallModalOpen(true);
  };

  const handleDecline = async (call: IncidentCallSession) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (call.id) {
      await declineIncidentCallSession(call.id, 'Declined by dispatcher').catch(() => undefined);
    }
    setIncomingCalls((prev) => prev.filter((c) => c.id !== call.id));
  };

  return (
    <>
      {currentCall && !activeCallSession && (
        <div className="fixed top-5 right-5 z-50 w-full max-w-sm animate-in slide-in-from-top-4 duration-300">
          <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
            {/* Glow accent */}
            <div className="absolute top-0 right-0 h-32 w-32 -translate-y-8 translate-x-8 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/60 shadow-inner">
                <Radio className="h-6 w-6 text-emerald-400 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Incoming Emergency Call
                  </span>
                  {incomingCalls.length > 1 && (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-300 border border-amber-500/30">
                      +{incomingCalls.length - 1} in queue
                    </span>
                  )}
                </div>

                <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight truncate mt-0.5">
                  {currentCall.callerName || 'Citizen in Need'}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {currentCall.callType === 'direct_emergency'
                    ? '1-Click Direct Emergency SOS'
                    : `Incident: ${currentCall.incidentReferenceNumber || currentCall.incidentType || 'Active Report'}`}
                </p>
                {currentCall.incidentLocationText && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    📍 {currentCall.incidentLocationText}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => handleAnswer(currentCall)}
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02]"
              >
                <Phone className="w-3.5 h-3.5" />
                Answer Call
              </button>

              <button
                onClick={() => handleDecline(currentCall)}
                className="h-9 px-3 rounded-xl border border-red-800/80 bg-red-950/40 hover:bg-red-950/80 text-red-400 text-xs font-bold transition-all"
                title="Decline"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Modal */}
      <ActiveCallModal
        session={activeCallSession}
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setActiveCallSession(null);
        }}
      />
    </>
  );
}
