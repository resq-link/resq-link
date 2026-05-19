'use client'

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import CommandBar from "@/components/CommandBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToEmergencyReports,
  subscribeToIncidents,
  QUADRANT_LABELS,
  type EmergencyReport,
  type IncidentRecord,
} from "@packages/firebase";
import IntakeListItem, { type IntakeQueueItem } from "@/components/IntakeListItem";
import IntakeDetailView from "@/components/IntakeDetailView";
import { Search, ShieldAlert, History as HistoryIcon } from "lucide-react";

const formatStatus = (status: IncidentRecord["status"]) =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const toMillis = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "object" && "toDate" in val) return val.toDate().getTime();
  if (typeof val === "number") return val;
  return new Date(val).getTime();
};

const statusTone: Record<IncidentRecord["status"], string> = {
  new: "border-slate-600 bg-slate-800/80 text-slate-200",
  awaiting_resources: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  liaison_pending: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
  dispatched: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  enroute: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  on_scene: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  unresolved: "border-red-500/30 bg-red-500/10 text-red-200",
};

const toQueueItemFromIncident = (incident: IncidentRecord): IntakeQueueItem => ({
  id: incident.id || incident.referenceNumber,
  channel: "incident",
  referenceNumber: incident.referenceNumber,
  incidentSubtypeLabel: incident.incidentSubtypeLabel,
  locationText: incident.locationText,
  priority: incident.priority,
  statusLabel: formatStatus(incident.status),
  statusToneClass: statusTone[incident.status] || "border-slate-600 bg-slate-800/80 text-slate-200",
  quadrantLabel: incident.quadrant ? QUADRANT_LABELS[incident.quadrant] : null,
  teamOnDutyLabel: incident.teamOnDuty ?? null,
  incidentDateLabel: incident.incidentDate ?? null,
  incidentTimeLabel: incident.incidentTime ?? null,
  createdAt: incident.createdAt,
  viewedByName: null,
  suggestedAgencyLabel: null,
  rawEmergencyReport: null,
  rawIncident: incident,
});

function HistoryContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("id");
  const { user } = useAuth();
  const router = useRouter();
  const [appEmergencyReports, setAppEmergencyReports] = useState<EmergencyReport[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentRecord[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<IntakeQueueItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Subscribe to real-time emergency reports and incidents
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const unsubscribeEmergencyReports = subscribeToEmergencyReports((reports) => {
      setAppEmergencyReports(reports);
    }, { statusFilter: "all", limitCount: 200 });

    const unsubscribeIncidents = subscribeToIncidents((items) => {
      setRecentIncidents(items);
    }, 200);

    return () => {
      unsubscribeEmergencyReports();
      unsubscribeIncidents();
    };
  }, [user, router]);

  // Auto-select deep-linked incident from URL parameters on mount/update
  useEffect(() => {
    if (!focusId || recentIncidents.length === 0) return;
    if (selectedQueueItem?.id === focusId) return;

    const matchInc = recentIncidents.find((i) => i.id === focusId || i.referenceNumber === focusId);
    if (matchInc && matchInc.resolutionStatus === 'resolved') {
      setSelectedQueueItem(toQueueItemFromIncident(matchInc));
    }
  }, [focusId, recentIncidents, selectedQueueItem?.id]);

  // Keep selected item updated with live updates
  useEffect(() => {
    if (!selectedQueueItem) return;
    const match = recentIncidents.find((i) => i.id === selectedQueueItem.id);
    if (match) {
      setSelectedQueueItem(toQueueItemFromIncident(match));
    }
  }, [recentIncidents, selectedQueueItem?.id]);

  // Compute resolved queue items from history
  const resolvedIncidents = useMemo(() => {
    return recentIncidents.filter((incident) => incident.resolutionStatus === "resolved");
  }, [recentIncidents]);

  const resolvedQueueItems = useMemo(() => {
    return resolvedIncidents
      .map(toQueueItemFromIncident)
      .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
  }, [resolvedIncidents]);

  const filteredQueueItems = useMemo(() => {
    let items = resolvedQueueItems;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter(
        (val) =>
          val.referenceNumber.toLowerCase().includes(q) ||
          val.incidentSubtypeLabel.toLowerCase().includes(q) ||
          val.locationText.toLowerCase().includes(q)
      );
    }
    return items;
  }, [resolvedQueueItems, searchQuery]);

  // Stats calculation
  const totalResolved = resolvedIncidents.length;
  
  // Calculate average response time
  const incidentsWithResponseTime = resolvedIncidents.filter(i => typeof i.responseTimeSeconds === 'number');
  const avgResponseTimeFormatted = useMemo(() => {
    if (incidentsWithResponseTime.length === 0) return '—';
    const sum = incidentsWithResponseTime.reduce((acc, curr) => acc + (curr.responseTimeSeconds || 0), 0);
    const avgSeconds = Math.round(sum / incidentsWithResponseTime.length);
    const mins = Math.floor(avgSeconds / 60);
    const secs = avgSeconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }, [incidentsWithResponseTime]);

  const totalTouchdowns = resolvedIncidents.filter(i => !!i.touchdownAt).length;

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Incident History" 
          description="Archive of past resolved incidents and operational logs"
          statsCategory="Archived"
          stats={[
            { label: 'Total Resolved', value: totalResolved, highlight: true },
            { label: 'Avg Response Time', value: avgResponseTimeFormatted },
            { label: 'GPS Touchdowns', value: totalTouchdowns }
          ]}
        />

        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 backdrop-blur-sm">
          {/* Search & Info Banner */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <HistoryIcon className="w-5 h-5 text-emerald-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">
                Resolution Archive
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {filteredQueueItems.length} ARCHIVED
              </span>
            </div>
 
            <div className="flex items-center gap-2">
              <div className="relative w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search resolution logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                />
              </div>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
            
            {/* Left Panel: Incident List */}
            <div className={`${selectedQueueItem ? "hidden lg:flex" : "flex"} flex-col min-h-0 w-full lg:w-[400px] border-r border-slate-800 bg-slate-900/10`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredQueueItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                    <ShieldAlert className="w-10 h-10 text-slate-800 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No resolved incidents found</p>
                    <p className="text-slate-600 text-xs mt-1">Past emergency responses will appear in this archive once resolved.</p>
                  </div>
                ) : (
                  filteredQueueItems.map((item) => (
                    <IntakeListItem 
                      key={`${item.channel}-${item.id}`} 
                      item={item} 
                      isSelected={selectedQueueItem?.id === item.id && selectedQueueItem?.channel === item.channel}
                      onClick={(item) => setSelectedQueueItem(item)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Detail Coordination View */}
            <div className={`${selectedQueueItem ? "flex" : "hidden lg:flex"} flex-1 flex-col min-h-0 p-4 lg:p-6 bg-slate-950/10 overflow-hidden`}>
              {selectedQueueItem ? (
                <IntakeDetailView 
                  item={selectedQueueItem} 
                  recentIncidents={recentIncidents}
                  allCivilianReports={appEmergencyReports}
                  onCloseDetail={() => setSelectedQueueItem(null)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-3xl m-4">
                  <HistoryIcon className="w-12 h-12 text-slate-800 mb-4 animate-pulse text-emerald-500/40" />
                  <p className="text-slate-400 text-base font-bold">No archived incident selected</p>
                  <p className="text-slate-500 text-xs max-w-sm mt-1">
                    Select a resolved incident from the archive list to review dispatcher tracking timelines, final post-incident reports, and responder response times.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-500 uppercase tracking-widest">
        Loading resolution history...
      </div>
    }>
      <HistoryContent />
    </Suspense>
  );
}
