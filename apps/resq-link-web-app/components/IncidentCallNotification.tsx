"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  subscribeToActiveIncidentCallSessions,
  type IncidentCallSession,
} from "@packages/firebase";
import { useAuth } from "@/contexts/AuthContext";

const IncidentCallPanel = dynamic(() => import("@/components/IncidentCallPanel"), {
  ssr: false,
});

const activeStatuses = new Set(["ringing", "accepted", "connected"]);

export default function IncidentCallNotification() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<IncidentCallSession[]>([]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    return subscribeToActiveIncidentCallSessions((nextSessions) => {
      setSessions(nextSessions.filter((session) => activeStatuses.has(session.status)));
    });
  }, [user]);

  const activeSession = useMemo(
    () =>
      sessions.find((session) => session.status === "ringing") ||
      sessions.find((session) => session.status === "accepted") ||
      sessions.find((session) => session.status === "connected") ||
      null,
    [sessions]
  );

  if (!user || !activeSession) {
    return null;
  }

  return <IncidentCallPanel user={user} session={activeSession} />;
}
