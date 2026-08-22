"use client";

import { Eye, Link2 } from "lucide-react";
import type { EmergencyReport } from "@packages/firebase";

type AssociatedCitizenReportListProps = {
  reports: EmergencyReport[];
  primaryReportId?: string | null;
  masterLatitude?: number | null;
  masterLongitude?: number | null;
  onViewReport: (report: EmergencyReport) => void;
};

const getDateLabel = (value: unknown) => {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const earthRadius = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function AssociatedCitizenReportList({
  reports,
  primaryReportId,
  masterLatitude,
  masterLongitude,
  onViewReport,
}: AssociatedCitizenReportListProps) {
  if (reports.length === 0) return null;

  return (
    <div className="grid gap-3">
      {reports.map((assocReport) => {
        const reportId = assocReport.id || "";
        const isPrimary =
          (primaryReportId && reportId === primaryReportId) ||
          (!primaryReportId && !assocReport.primaryReportId);
        const distance =
          masterLatitude != null &&
          masterLongitude != null &&
          assocReport.latitude != null &&
          assocReport.longitude != null
            ? Math.round(
                distanceMeters(
                  masterLatitude,
                  masterLongitude,
                  assocReport.latitude,
                  assocReport.longitude,
                ),
              )
            : null;

        return (
          <div
            key={reportId || assocReport.createdAt?.toString()}
            className="rounded-lg border border-slate-800 bg-slate-950/50 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs font-black text-sky-400">
                    APP-{reportId.slice(-6).toUpperCase() || "REPORT"}
                  </p>
                  {isPrimary ? (
                    <span className="rounded border border-emerald-900/50 bg-emerald-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                      Source
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-slate-400">Verified Civilian Reporter</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded border border-sky-900/50 bg-sky-950/40 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-sky-400">
                <Link2 className="h-3 w-3" />
                Linked
              </span>
            </div>

            <div className="mt-2 grid gap-2 grid-cols-3">
              <Metric label="Reported" value={getDateLabel(assocReport.createdAt)} />
              <Metric
                label="Distance"
                value={distance != null ? `${distance} m` : "—"}
              />
              <Metric label="Status" value="Linked" />
            </div>

            <button
              type="button"
              onClick={() => onViewReport(assocReport)}
              className="mt-2 inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-200 transition-colors hover:border-sky-800 hover:bg-sky-950/30 hover:text-sky-300"
            >
              <Eye className="h-3 w-3" />
              View Report
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800/80 bg-slate-900/40 px-2 py-1.5">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold text-slate-200">{value}</p>
    </div>
  );
}
