"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import CommandBar from "@/components/CommandBar";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignDispatcherToEmergency,
  assignResponderToEmergency,
  moveEmergencyReportToHistory,
  subscribeToEmergencyReports,
  subscribeToIncidents,
  associateReportsWithIncident,
  disassociateReportFromIncident,
  linkReportToReport,
  unlinkReportFromReport,
  getSuggestedAgenciesForEmergencyType,
  QUADRANT_LABELS,
  type DispatcherRole,
  type EmergencyReport,
  type IncidentRecord,
} from "@packages/firebase";
import IntakeListItem, { type IntakeQueueItem } from "@/components/IntakeListItem";
import IntakeDetailView from "@/components/IntakeDetailView";
import { Search, ShieldAlert, Activity } from "lucide-react";

const getEmergencyIncidentTypeName = (
  incidentType: EmergencyReport["incidentType"],
) => {
  const typeMap: Record<EmergencyReport["incidentType"], string> = {
    fire: "Fire",
    medical: "Medical Emergency",
    vehicular_accident: "Vehicular Accident",
    police_emergency: "Police Emergency",
    electrical_powerline_hazard: "Electrical / Powerline Hazard",
    other_emergency: "Other Emergency",
  };

  return typeMap[incidentType] || "Emergency";
};

function getResponderAgencyLabel(role: DispatcherRole): string {
  switch (role) {
    case "AMBULANCE":
      return "Ambulance";
    case "MDRRMO":
      return "MDRRMO";
    default:
      return role;
  }
}

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

const emergencyStatusTone: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  active: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  enroute: "border-indigo-500/30 bg-indigo-500/10 text-indigo-200",
  on_scene: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  resolved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
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

function toQueueItemFromEmergency(report: EmergencyReport): IntakeQueueItem {
  const suggestedAgency =
    report.suggestedAgency ||
    getSuggestedAgenciesForEmergencyType(report.incidentType)[0] ||
    null;

  return {
    id: report.id || `app-${String(report.createdAt ?? Date.now())}`,
    channel: "emergency_report",
    referenceNumber: report.id ? `APP-${report.id.slice(-6).toUpperCase()}` : "APP-REPORT",
    incidentSubtypeLabel: getEmergencyIncidentTypeName(report.incidentType),
    locationText: report.locationText,
    priority: report.priority || "medium",
    statusLabel: formatStatus(
      report.status === "done" ? "resolved" : (report.status as IncidentRecord["status"]),
    ),
    statusToneClass:
      emergencyStatusTone[report.status] || "border-slate-600 bg-slate-800/80 text-slate-200",
    quadrantLabel: null,
    teamOnDutyLabel: null,
    incidentDateLabel: null,
    incidentTimeLabel: null,
    createdAt: report.createdAt,
    viewedByName: report.viewedByName || null,
    suggestedAgencyLabel: suggestedAgency
      ? getResponderAgencyLabel(suggestedAgency)
      : null,
    rawEmergencyReport: report,
    rawIncident: null,
  };
}

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

export default function ActiveIncidentsPage() {
  const { user } = useAuth();
  const [appEmergencyReports, setAppEmergencyReports] = useState<EmergencyReport[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<IncidentRecord[]>([]);
  const [selectedQueueItem, setSelectedQueueItem] = useState<IntakeQueueItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  // Subscribe to real-time emergency reports and incidents
  useEffect(() => {
    if (!user) return;

    const unsubscribeEmergencyReports = subscribeToEmergencyReports((reports) => {
      setAppEmergencyReports(reports);
    }, { statusFilter: "all", limitCount: 200 });

    const unsubscribeIncidents = subscribeToIncidents((items) => {
      setRecentIncidents(items);
    }, 100);

    return () => {
      unsubscribeEmergencyReports();
      unsubscribeIncidents();
    };
  }, [user]);

  // Compute active queues from both collections
  const activeAppQueueItems = useMemo(() => {
    return appEmergencyReports
      .filter((report) => ["active", "enroute", "on_scene"].includes(report.status) && !report.primaryReportId)
      .map(toQueueItemFromEmergency);
  }, [appEmergencyReports]);

  const activeManualQueueItems = useMemo(() => {
    return recentIncidents
      .filter((incident) => incident.resolutionStatus === "open")
      .map(toQueueItemFromIncident);
  }, [recentIncidents]);

  const activeQueueItems = useMemo(() => {
    return [...activeAppQueueItems, ...activeManualQueueItems].sort(
      (left, right) => toMillis(right.createdAt) - toMillis(left.createdAt)
    );
  }, [activeAppQueueItems, activeManualQueueItems]);

  // Compute duplicate counts for app reports
  const duplicateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    activeQueueItems.forEach((item) => {
      if (item.id && item.channel === "emergency_report") {
        counts[item.id] = appEmergencyReports.filter(r => r.primaryReportId === item.id).length;
      }
    });
    return counts;
  }, [appEmergencyReports, activeQueueItems]);

  const filteredQueueItems = useMemo(() => {
    let items = activeQueueItems;

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
  }, [activeQueueItems, searchQuery]);

  // Keep selected item updated with live updates
  useEffect(() => {
    if (!selectedQueueItem) return;

    if (selectedQueueItem.channel === "emergency_report") {
      const match = appEmergencyReports.find((r) => r.id === selectedQueueItem.id);
      if (match) {
        setSelectedQueueItem(toQueueItemFromEmergency(match));
      }
    } else if (selectedQueueItem.channel === "incident") {
      const match = recentIncidents.find((i) => i.id === selectedQueueItem.id);
      if (match) {
        setSelectedQueueItem(toQueueItemFromIncident(match));
      }
    }
  }, [appEmergencyReports, recentIncidents, selectedQueueItem?.id]);

  // Actions/handlers
  const handleRespondToAppReport = async (
    report: EmergencyReport,
    responder: {
      uid: string;
      label: string;
      agency: DispatcherRole;
      suggestedAgency: DispatcherRole | null;
    },
  ) => {
    if (!report.id) return;

    try {
      await assignDispatcherToEmergency(report.id, responder.uid);
      const updated = await assignResponderToEmergency(report.id, {
        responder: responder.label,
        assignedResponderId: responder.uid,
        assignedAgency: responder.agency,
        suggestedAgency: responder.suggestedAgency || report.suggestedAgency || null,
      });
      setSelectedQueueItem(toQueueItemFromEmergency(updated));
      setPageSuccess(
        `Report ${report.id.slice(-6).toUpperCase()} is now assigned to ${responder.label}.`,
      );
    } catch (error: any) {
      setPageError(error.message || "Failed to assign report.");
    }
  };

  const handleMoveAppReportToHistory = async (report: EmergencyReport) => {
    if (!report.id) return;

    try {
      await moveEmergencyReportToHistory(report.id);
      setSelectedQueueItem(null);
      setPageSuccess(
        `Report ${report.id.slice(-6).toUpperCase()} was resolved and moved to history.`,
      );
    } catch (error: any) {
      setPageError(error.message || "Failed to move report to history.");
    }
  };

  const handleLinkToIncident = async (reportId: string, incidentId: string) => {
    try {
      await associateReportsWithIncident(incidentId, [reportId]);
      setPageSuccess("Successfully linked report to master incident.");
    } catch (error: any) {
      setPageError(error.message || "Failed to link report.");
    }
  };

  const handleUnlinkFromIncident = async (reportId: string, incidentId: string) => {
    try {
      await disassociateReportFromIncident(incidentId, reportId);
      setPageSuccess("Successfully unlinked civilian report.");
    } catch (error: any) {
      setPageError(error.message || "Failed to unlink report.");
    }
  };

  const handleLinkReportToReport = async (primaryReportId: string, secondaryReportId: string) => {
    try {
      await linkReportToReport(primaryReportId, secondaryReportId);
      setPageSuccess("Reports grouped successfully.");
    } catch (error: any) {
      setPageError(error.message || "Failed to group reports.");
    }
  };

  const handleUnlinkReportFromReport = async (secondaryReportId: string) => {
    try {
      await unlinkReportFromReport(secondaryReportId);
      setPageSuccess("Report ungrouped.");
    } catch (error: any) {
      setPageError(error.message || "Failed to ungroup report.");
    }
  };

  const handleLinkAllReports = async (primaryReportId: string, secondaryReportIds: string[]) => {
    try {
      await Promise.all(secondaryReportIds.map(secId => linkReportToReport(primaryReportId, secId)));
      setPageSuccess(`Successfully grouped duplicates.`);
    } catch (error: any) {
      setPageError(error.message || "Failed to group reports.");
    }
  };

  const activeCount = activeQueueItems.filter(
    (i) => i.rawEmergencyReport?.status === "active" || i.rawIncident?.status === "dispatched"
  ).length;
  const enRouteCount = activeQueueItems.filter(
    (i) => i.rawEmergencyReport?.status === "enroute" || i.rawIncident?.status === "enroute"
  ).length;
  const onSceneCount = activeQueueItems.filter(
    (i) => i.rawEmergencyReport?.status === "on_scene" || i.rawIncident?.status === "on_scene"
  ).length;

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-full">
        <CommandBar 
          pageName="Active Incidents" 
          description="Real-time responder coordination and operational tracking"
          statsCategory="Incidents"
          stats={[
            { label: 'Active Reports', value: activeCount, highlight: true },
            { label: 'En Route', value: enRouteCount },
            { label: 'On Scene', value: onSceneCount }
          ]}
        />

        <div className="flex-1 flex flex-col min-h-0 bg-slate-950/20 backdrop-blur-sm">
          {/* Active Search Bar */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-100">
                Dispatch Board
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {activeQueueItems.length} ELEVATED
              </span>
            </div>
 
            <div className="flex items-center gap-2">
              <div className="relative w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search active incidents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-4 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                />
              </div>
            </div>
          </div>

          {(pageError || pageSuccess) && (
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className={pageError ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                {pageError || pageSuccess}
              </span>
              <button 
                onClick={() => { setPageError(null); setPageSuccess(null); }}
                className="text-slate-500 hover:text-slate-350"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Master-Detail Layout */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none"></div>
            
            {/* Left Panel: Active Incident List */}
            <div className={`${selectedQueueItem ? "hidden lg:flex" : "flex"} flex-col min-h-0 w-full lg:w-[400px] border-r border-slate-800 bg-slate-900/10`}>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredQueueItems.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-2xl">
                    <ShieldAlert className="w-10 h-10 text-slate-800 mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No active incidents</p>
                    <p className="text-slate-600 text-xs mt-1">All verified alerts have been resolved or are awaiting triage.</p>
                  </div>
                ) : (
                  filteredQueueItems.map((item) => (
                    <IntakeListItem 
                      key={`${item.channel}-${item.id}`} 
                      item={item} 
                      isSelected={selectedQueueItem?.id === item.id && selectedQueueItem?.channel === item.channel}
                      duplicateCount={duplicateCounts[item.id || ""]}
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
                  onRespond={handleRespondToAppReport}
                  onMoveToHistory={handleMoveAppReportToHistory}
                  onLinkToIncident={handleLinkToIncident}
                  onUnlinkFromIncident={handleUnlinkFromIncident}
                  onLinkReportToReport={handleLinkReportToReport}
                  onUnlinkReportFromReport={handleUnlinkReportFromReport}
                  onLinkAllReports={handleLinkAllReports}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-800/50 rounded-3xl m-4">
                  <Activity className="w-12 h-12 text-slate-800 mb-4 animate-pulse" />
                  <p className="text-slate-400 text-base font-bold">No incident selected</p>
                  <p className="text-slate-500 text-xs max-w-sm mt-1">
                    Select an active elevated incident from the left queue to coordinate dispatch operations, track responders, and update live case logs.
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
