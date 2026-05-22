"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  acceptIncidentCallSession,
  declineIncidentCallSession,
  endIncidentCallSession,
  failIncidentCallSession,
  markIncidentCallConnected,
  subscribeToActiveIncidentCallSessions,
  type IncidentCallSession,
} from "@packages/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  BellRing,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Volume2,
} from "lucide-react";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
} from "agora-rtc-sdk-ng";

type TokenResponse = {
  appId: string;
  token: string;
  uid: string;
  channelName: string;
};

const activeStatuses = new Set(["ringing", "accepted", "connected"]);

export default function IncidentCallNotification() {
  const { user } = useAuth();
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<ILocalAudioTrack | null>(null);
  const remoteTracksRef = useRef<Map<string | number, IAgoraRTCRemoteUser>>(new Map());
  const [sessions, setSessions] = useState<IncidentCallSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "ringing" | "joining" | "connected" | "ended" | "failed">("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    return subscribeToActiveIncidentCallSessions((nextSessions) => {
      setSessions(nextSessions.filter((session) => activeStatuses.has(session.status)));
    });
  }, [user]);

  const activeSession = useMemo(() => {
    if (activeSessionId) {
      const current = sessions.find((session) => session.id === activeSessionId);
      if (current) return current;
    }
    return (
      sessions.find((session) => session.status === "ringing") ||
      sessions.find((session) => session.status === "accepted") ||
      sessions.find((session) => session.status === "connected") ||
      null
    );
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (!activeSession) {
      setPhase((current) => (current === "connected" ? current : "idle"));
      return;
    }
    if (phase === "idle" || phase === "ended" || phase === "failed") {
      setPhase(activeSession.status === "connected" ? "connected" : "ringing");
    }
  }, [activeSession, phase]);

  useEffect(() => {
    return () => {
      void leaveAgora();
    };
  }, []);

  const fetchToken = async (session: IncidentCallSession): Promise<TokenResponse> => {
    const idToken = await user?.getIdToken();
    if (!idToken) {
      throw new Error("Sign in is required before answering a call.");
    }

    const response = await fetch("/api/agora/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        incidentId: session.incidentId,
        channelName: session.channelName,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Unable to get an Agora token.");
    }
    return data;
  };

  const leaveAgora = async () => {
    const client = clientRef.current;
    const track = localTrackRef.current;
    try {
      if (track) {
        track.stop();
        track.close();
      }
      remoteTracksRef.current.forEach((remoteUser) => {
        remoteUser.audioTrack?.stop();
      });
      remoteTracksRef.current.clear();
      if (client) {
        client.removeAllListeners();
        await client.leave();
      }
    } catch (leaveError) {
      console.warn("Agora web leave failed:", leaveError);
    } finally {
      clientRef.current = null;
      localTrackRef.current = null;
      setMuted(false);
    }
  };

  const handleAnswer = async () => {
    if (!activeSession?.id) return;

    setActiveSessionId(activeSession.id);
    setError("");
    setPhase("joining");

    try {
      await acceptIncidentCallSession(activeSession.id);
      const tokenPayload = await fetchToken(activeSession);
      const AgoraRTC = await import("agora-rtc-sdk-ng");
      const client = AgoraRTC.default.createClient({ mode: "rtc", codec: "vp8" });
      const localAudioTrack = await AgoraRTC.default.createMicrophoneAudioTrack();

      client.on("user-published", async (remoteUser, mediaType) => {
        await client.subscribe(remoteUser, mediaType);
        if (mediaType === "audio") {
          remoteUser.audioTrack?.play();
          remoteTracksRef.current.set(remoteUser.uid, remoteUser);
          if (activeSession.id) {
            await markIncidentCallConnected(activeSession.id).catch(console.error);
          }
          setPhase("connected");
        }
      });

      client.on("user-unpublished", (remoteUser) => {
        remoteUser.audioTrack?.stop();
        remoteTracksRef.current.delete(remoteUser.uid);
      });

      clientRef.current = client;
      localTrackRef.current = localAudioTrack;
      await client.join(
        tokenPayload.appId,
        tokenPayload.channelName,
        tokenPayload.token,
        tokenPayload.uid
      );
      await client.publish([localAudioTrack]);
      await markIncidentCallConnected(activeSession.id);
      setPhase("connected");
    } catch (answerError) {
      const message = answerError instanceof Error ? answerError.message : "Unable to answer call.";
      setError(message);
      setPhase("failed");
      await leaveAgora();
      if (activeSession.id) {
        await failIncidentCallSession(activeSession.id, message).catch(console.error);
      }
    }
  };

  const handleDecline = async () => {
    if (!activeSession?.id) return;
    setError("");
    await leaveAgora();
    await declineIncidentCallSession(activeSession.id).catch((declineError) => {
      setError(declineError instanceof Error ? declineError.message : "Unable to decline call.");
    });
    setPhase("ended");
    setActiveSessionId(null);
  };

  const handleEnd = async () => {
    if (!activeSession?.id) return;
    setError("");
    await leaveAgora();
    await endIncidentCallSession(activeSession.id).catch((endError) => {
      setError(endError instanceof Error ? endError.message : "Unable to end call.");
    });
    setPhase("ended");
    setActiveSessionId(null);
  };

  const handleToggleMute = async () => {
    const nextMuted = !muted;
    await localTrackRef.current?.setMuted(nextMuted);
    setMuted(nextMuted);
  };

  if (!user || !activeSession) {
    return null;
  }

  const connected = phase === "connected" || activeSession.status === "connected";
  const joining = phase === "joining";

  return (
    <div className="fixed right-4 top-20 z-[70] w-[min(420px,calc(100vw-2rem))] animate-in slide-in-from-right-8 fade-in duration-300">
      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="border-b border-slate-800/80 bg-slate-900/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {connected ? <PhoneCall size={22} /> : <BellRing size={22} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">
                {connected ? "Incident call connected" : "Incoming civilian call"}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                Incident {activeSession.incidentId}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${connected ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
              {connected ? "Connected" : joining ? "Joining" : "Ringing"}
            </span>
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-5 text-slate-300">
            Channel <span className="font-mono text-slate-100">{activeSession.channelName}</span>
          </p>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          {connected ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                {muted ? <MicOff size={17} /> : <Mic size={17} />}
                {muted ? "Muted" : "Mute"}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-medium text-slate-100"
                title="Browser output device is controlled by the system."
              >
                <Volume2 size={17} />
                Audio
              </button>
              <button
                type="button"
                onClick={handleEnd}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <PhoneOff size={17} />
                End
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDecline}
                disabled={joining}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PhoneOff size={17} />
                Decline
              </button>
              <button
                type="button"
                onClick={handleAnswer}
                disabled={joining}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Phone size={17} />
                {joining ? "Answering..." : "Answer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
