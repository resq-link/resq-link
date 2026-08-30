'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, Track, type RemoteTrack, type RemoteTrackPublication, type RemoteParticipant } from 'livekit-client';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Radio, Clock, ShieldAlert } from 'lucide-react';
import {
  endIncidentCallSession,
  markIncidentCallConnected,
  subscribeToIncidentCallSession,
  type IncidentCallSession,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';

const TERMINAL_STATUSES = ['ended', 'missed', 'declined', 'failed'] as const;

interface ActiveCallModalProps {
  session: IncidentCallSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ActiveCallModal({ session, isOpen, onClose }: ActiveCallModalProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [sessionStatus, setSessionStatus] = useState<string | null>(session?.status || null);
  const [remoteLeft, setRemoteLeft] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const didCloseRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const cleanUpRoom = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.remove();
    });
    audioElementsRef.current = [];

    if (roomRef.current) {
      await roomRef.current.disconnect().catch(() => undefined);
      roomRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connectToLiveKit = useCallback(async () => {
    if (!session || !user) return;
    setIsConnecting(true);
    setError(null);
    setDuration(0);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/calls/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          roomName: session.roomName || session.channelName,
          participantName: user.displayName || user.email || 'Dispatcher',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to fetch voice room token.');
      }

      const { token, url } = await res.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElementsRef.current.push(audioElement);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => {
          el.remove();
          audioElementsRef.current = audioElementsRef.current.filter((e) => e !== el);
        });
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        if (room.remoteParticipants.size === 0) {
          setRemoteLeft(true);
        }
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setIsConnected(true);
      setIsConnecting(false);

      if (session.id) {
        await markIncidentCallConnected(session.id).catch(() => undefined);
      }

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[ActiveCallModal] LiveKit Connection error:', err);
      setError(err?.message || 'Unable to establish voice connection.');
      setIsConnecting(false);
    }
  }, [session, user]);

  useEffect(() => {
    if (isOpen && session) {
      connectToLiveKit();
    } else {
      cleanUpRoom();
    }
    return () => {
      cleanUpRoom();
    };
  }, [isOpen, session, connectToLiveKit, cleanUpRoom]);

  const toggleMute = async () => {
    if (!roomRef.current) return;
    const newMuted = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  };

  const toggleSpeaker = () => {
    const newMuteSpeaker = !isSpeakerMuted;
    audioElementsRef.current.forEach((el) => {
      el.muted = newMuteSpeaker;
    });
    setIsSpeakerMuted(newMuteSpeaker);
  };

  const handleEndCall = useCallback(async (alreadyEnded = false) => {
    if (didCloseRef.current) return;
    didCloseRef.current = true;
    if (!alreadyEnded && session?.id) {
      await endIncidentCallSession(session.id).catch(() => undefined);
    }
    await cleanUpRoom();
    onCloseRef.current();
  }, [session?.id, cleanUpRoom]);

  useEffect(() => {
    didCloseRef.current = false;
    setRemoteLeft(false);
    setSessionStatus(session?.status || null);
  }, [isOpen, session?.id]);

  useEffect(() => {
    if (!isOpen || !session?.id) return undefined;

    const unsubscribe = subscribeToIncidentCallSession(session.id, (liveSession) => {
      if (liveSession?.status) {
        setSessionStatus(liveSession.status);
      }
    });

    return () => unsubscribe();
  }, [isOpen, session?.id]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const isTerminal = TERMINAL_STATUSES.includes(sessionStatus as (typeof TERMINAL_STATUSES)[number]);
    if (!isTerminal && !remoteLeft) return undefined;

    const timeout = setTimeout(() => {
      handleEndCall(isTerminal);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isOpen, sessionStatus, remoteLeft, handleEndCall]);

  useEffect(() => {
    if (!isOpen || !remoteLeft || !session?.id) return;
    if (TERMINAL_STATUSES.includes(sessionStatus as (typeof TERMINAL_STATUSES)[number])) return;
    endIncidentCallSession(session.id).catch(() => undefined);
  }, [isOpen, remoteLeft, session?.id, sessionStatus]);

  if (!isOpen || !session) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const isDirectEmergency = session.callType === 'direct_emergency';
  const callerLabel = session.callerName || (session.callerRole === 'civilian' ? 'Citizen' : 'Responder');
  const targetLabel = session.targetName || session.incidentReferenceNumber || 'Emergency Dispatch';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center p-6 text-center">
        {/* Glow Header */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Call Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
          {isDirectEmergency ? '1-Click Direct Emergency Call' : `Incident ${session.incidentReferenceNumber || 'Call'}`}
        </div>

        {/* Caller Avatar / Waves */}
        <div className="relative my-4 flex items-center justify-center">
          <div className={`w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all ${isConnected ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-500/20 animate-pulse' : 'border-slate-700 bg-slate-800'}`}>
            <ShieldAlert className={`w-12 h-12 ${isConnected ? 'text-emerald-400' : 'text-slate-400'}`} />
          </div>
          {isConnected && (
            <div className="absolute inset-0 rounded-full border border-emerald-500/40 animate-ping" />
          )}
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight mt-1">{callerLabel}</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {session.callerPhone ? `Phone: ${session.callerPhone}` : targetLabel}
        </p>
        {session.incidentLocationText && (
          <p className="text-[11px] text-slate-500 max-w-xs truncate mt-1">📍 {session.incidentLocationText}</p>
        )}

        {/* Status / Timer */}
        <div className="mt-4 mb-6 flex items-center gap-1.5 text-sm font-semibold">
          {TERMINAL_STATUSES.includes(sessionStatus as (typeof TERMINAL_STATUSES)[number]) || remoteLeft ? (
            <span className="text-slate-400">Call Ended</span>
          ) : isConnecting ? (
            <span className="text-amber-400 animate-pulse">Connecting to audio room...</span>
          ) : isConnected ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-base">
              <Clock className="w-4 h-4" />
              {formatTime(duration)}
            </span>
          ) : (
            <span className="text-slate-500">Call Disconnected</span>
          )}
        </div>

        {error && (
          <div className="w-full mb-4 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300 font-medium">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4 mt-2">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            disabled={!isConnected}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* End Call */}
          <button
            onClick={() => handleEndCall()}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 border border-red-500 text-white flex items-center justify-center shadow-lg shadow-red-900/40 transition-all hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Speaker Mute */}
          <button
            onClick={toggleSpeaker}
            disabled={!isConnected}
            className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${
              isSpeakerMuted
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
