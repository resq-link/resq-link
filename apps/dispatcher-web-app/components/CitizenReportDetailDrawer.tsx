"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X, FileText, MapPin, Image as ImageIcon } from "lucide-react";
import type { EmergencyReport } from "@packages/firebase";
import { getCivilianEmergencyTypeLabel, getReportImageUrls } from "@packages/firebase";
import InitialNarrativeDisplay from "@/components/InitialNarrativeDisplay";

type CitizenReportDetailDrawerProps = {
  report: EmergencyReport | null;
  onClose: () => void;
};

const getDateLabel = (value: unknown) => {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function CitizenReportDetailDrawer({
  report,
  onClose,
}: CitizenReportDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!report) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [report, onClose]);

  if (!mounted || !report) return null;

  const imageUrls = getReportImageUrls(report);
  const reportLabel = report.id ? `APP-${report.id.slice(-6).toUpperCase()}` : "APP-REPORT";

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close report details"
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-slate-800 bg-slate-900 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
              Citizen Report
            </p>
            <h3 className="mt-1 font-mono text-lg font-black text-slate-100">{reportLabel}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {getCivilianEmergencyTypeLabel(report.incidentType, report.typeProfile)} ·{" "}
              {getDateLabel(report.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 custom-scrollbar">
          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
            </div>
            <p className="text-sm text-slate-200">{report.locationText || "—"}</p>
            {report.landmark ? (
              <p className="mt-2 text-xs text-slate-400">
                Landmark: <span className="text-slate-200">{report.landmark}</span>
              </p>
            ) : null}
            {report.latitude != null && report.longitude != null ? (
              <p className="mt-2 font-mono text-[11px] text-slate-500">
                {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Report Details
              </span>
            </div>
            <InitialNarrativeDisplay
              description={report.description}
              landmark={report.landmark}
              peopleInvolved={report.peopleInvolved}
              fieldAssessment={report.fieldAssessment}
              typeProfile={report.typeProfile}
              incidentType={report.incidentType}
            />
          </section>

          {imageUrls.length > 0 ? (
            <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-slate-400">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Evidence ({imageUrls.length})
                </span>
              </div>
              <div className="grid gap-3">
                {imageUrls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`Citizen evidence ${index + 1}`}
                    className="max-h-64 w-full rounded-lg border border-slate-800 object-cover"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
