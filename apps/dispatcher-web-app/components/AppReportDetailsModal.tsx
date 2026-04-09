"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAllDispatchers,
  getSuggestedAgenciesForEmergencyType,
  type DispatcherAccount,
  type DispatcherRole,
  type EmergencyReport,
} from "@packages/firebase";

type AppReportDetailsModalProps = {
  isOpen: boolean;
  report: EmergencyReport | null;
  onClose: () => void;
  onRespondStart: (report: EmergencyReport) => void | Promise<void>;
  onRespond: (
    report: EmergencyReport,
    responder: {
      uid: string;
      label: string;
      agency: DispatcherRole;
      suggestedAgency: DispatcherRole | null;
    },
  ) => void | Promise<void>;
  onReject: (report: EmergencyReport) => void | Promise<void>;
};

type ResponderOption = {
  uid: string;
  account: DispatcherAccount;
};

const getIncidentTypeName = (incidentType: EmergencyReport["incidentType"]) => {
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

const getExpectedAdditionalFields = (
  incidentType: EmergencyReport["incidentType"],
): string[] => {
  const fieldMap: Record<EmergencyReport["incidentType"], string[]> = {
    fire: [
      "Fire scale / affected area",
      "Structure or property involved",
      "People trapped or injured",
      "Source of fire if known",
    ],
    medical: [
      "Patient condition",
      "Conscious / breathing status",
      "Age or estimated age",
      "Immediate first-aid needs",
    ],
    vehicular_accident: [
      "Vehicles involved",
      "Number of injured persons",
      "Road obstruction status",
      "Collision type / cause if known",
    ],
    police_emergency: [
      "Nature of threat",
      "Suspect presence or description",
      "Weapons involved",
      "Immediate safety risk",
    ],
    electrical_powerline_hazard: [
      "Type of utility hazard",
      "Live wire / spark / outage status",
      "Affected homes or road area",
      "Visible damage details",
    ],
    other_emergency: [
      "Incident-specific summary",
      "Who is affected",
      "Current hazard level",
      "Support needed on scene",
    ],
  };

  return fieldMap[incidentType] || fieldMap.other_emergency;
};

const getDateLabel = (value: EmergencyReport["createdAt"] | EmergencyReport["viewedAt"]) => {
  if (!value) return "—";
  const date =
    value instanceof Date
      ? value
      : typeof value === "object" && value && "toDate" in value
        ? value.toDate()
        : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function AppReportDetailsModal({
  isOpen,
  report,
  onClose,
  onRespondStart,
  onRespond,
  onReject,
}: AppReportDetailsModalProps) {
  const [isChoosingResponder, setIsChoosingResponder] = useState(false);
  const [responders, setResponders] = useState<ResponderOption[]>([]);
  const [selectedResponderId, setSelectedResponderId] = useState("");
  const [isLoadingResponders, setIsLoadingResponders] = useState(false);
  const [responderError, setResponderError] = useState<string | null>(null);
  const [showingFallbackPool, setShowingFallbackPool] = useState(false);
  const suggestedAgencies = useMemo(
    () => (report ? getSuggestedAgenciesForEmergencyType(report.incidentType) : []),
    [report],
  );
  const primarySuggestedAgency = suggestedAgencies[0] || null;

  const selectedResponder = useMemo(
    () => responders.find((responder) => responder.uid === selectedResponderId) || null,
    [responders, selectedResponderId],
  );
  const expectedAdditionalFields = useMemo(
    () => getExpectedAdditionalFields(report?.incidentType || "other_emergency"),
    [report?.incidentType],
  );

  useEffect(() => {
    if (!isOpen || !report) {
      setIsChoosingResponder(false);
      setResponders([]);
      setSelectedResponderId("");
      setIsLoadingResponders(false);
      setResponderError(null);
      setShowingFallbackPool(false);
    }
  }, [isOpen, report]);

  if (!isOpen || !report) return null;

  const getResponderLabel = (responder: ResponderOption) =>
    responder.account.fullName?.trim() ||
    responder.account.email ||
    responder.uid;

  const loadResponders = async () => {
    setIsLoadingResponders(true);
    setResponderError(null);

    try {
      const accounts = await getAllDispatchers();
      const responderAccounts = accounts.filter((entry) =>
        (entry.account.designation || "").toLowerCase().includes("responder"),
      );
      const responderPool =
        responderAccounts.length > 0
          ? responderAccounts
          : accounts.filter((entry) => entry.uid);
      const matchingResponders = primarySuggestedAgency
        ? responderPool.filter(
            (entry) => entry.account.role === primarySuggestedAgency,
          )
        : [];
      const visibleResponders =
        matchingResponders.length > 0 ? matchingResponders : responderPool;

      setResponders(visibleResponders);
      setShowingFallbackPool(
        responderAccounts.length === 0 ||
          Boolean(primarySuggestedAgency && matchingResponders.length === 0),
      );
      setSelectedResponderId((current) => {
        if (current && visibleResponders.some((entry) => entry.uid === current)) {
          return current;
        }
        return visibleResponders[0]?.uid || "";
      });
    } catch (error: any) {
      setResponderError(error.message || "Failed to load responders.");
      setResponders([]);
      setShowingFallbackPool(false);
    } finally {
      setIsLoadingResponders(false);
    }
  };

  const handleStartRespond = async () => {
    await onRespondStart(report);
    setIsChoosingResponder(true);
    if (responders.length === 0 && !isLoadingResponders) {
      await loadResponders();
    }
  };

  const handleConfirmRespond = async () => {
    if (!selectedResponder) {
      setResponderError("Select a responder before continuing.");
      return;
    }

    await onRespond(report, {
      uid: selectedResponder.uid,
      label: getResponderLabel(selectedResponder),
      agency: selectedResponder.account.role,
      suggestedAgency: primarySuggestedAgency,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              App Report
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-100">
              {getIncidentTypeName(report.incidentType)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="flex flex-wrap gap-3 border-b border-slate-800 px-6 py-4">
          {!isChoosingResponder ? (
            <button
              type="button"
              onClick={() => void handleStartRespond()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Respond
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleConfirmRespond()}
                disabled={isLoadingResponders || !selectedResponderId}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Responder
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsChoosingResponder(false);
                  setResponderError(null);
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
              >
                Cancel Response
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void onReject(report)}
            className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:border-red-700"
          >
            Reject
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            {isChoosingResponder ? (
              <section className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Choose Responder
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      The system suggests the first matching agency, then lets you confirm or override the responder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadResponders()}
                    disabled={isLoadingResponders}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Suggested Agency
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-100">
                      {primarySuggestedAgency || "No automatic suggestion"}
                    </p>
                    {suggestedAgencies.length > 1 ? (
                      <p className="mt-1 text-xs text-slate-400">
                        Additional matches: {suggestedAgencies.slice(1).join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Selection Rule
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {primarySuggestedAgency
                        ? "Responders are filtered to the suggested agency first. Use the dropdown if you need a different person."
                        : "No direct agency match was found, so the dropdown is available immediately."}
                    </p>
                  </div>
                </div>

                {showingFallbackPool ? (
                  <p className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                    {primarySuggestedAgency
                      ? "No responder account matched the suggested agency. Showing the broader active responder pool instead."
                      : "No responder-designated accounts were found. Showing all active dispatcher accounts instead."}
                  </p>
                ) : null}

                {responderError ? (
                  <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                    {responderError}
                  </p>
                ) : null}

                {isLoadingResponders ? (
                  <p className="mt-3 text-sm text-slate-400">Loading responders...</p>
                ) : responders.length > 0 ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Responder
                      </span>
                      <select
                        value={selectedResponderId}
                        onChange={(event) => {
                          setSelectedResponderId(event.target.value);
                          setResponderError(null);
                        }}
                        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select responder</option>
                        {responders.map((responder) => (
                          <option key={responder.uid} value={responder.uid}>
                            {getResponderLabel(responder)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        Selection Details
                      </p>
                      {selectedResponder ? (
                        <div className="mt-2 space-y-1.5 text-sm text-slate-300">
                          <p className="font-medium text-slate-100">
                            {getResponderLabel(selectedResponder)}
                          </p>
                          <p>Agency: {selectedResponder.account.role}</p>
                          <p>
                            Suggested agency: {primarySuggestedAgency || "None"}
                          </p>
                          <p>
                            Designation: {selectedResponder.account.designation || "Not set"}
                          </p>
                          <p>Email: {selectedResponder.account.email}</p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-slate-400">
                          Pick a responder to review the assignment details.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No active responder accounts are available right now.
                  </p>
                )}
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Status</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Report ID:</span>{" "}
                  <span className="font-medium text-slate-100">{report.id || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Current status:</span>{" "}
                  <span className="font-medium text-slate-100">{report.status}</span>
                </p>
                <p>
                  <span className="text-slate-500">Priority:</span>{" "}
                  <span className="font-medium text-slate-100">{report.priority || "medium"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Viewed by:</span>{" "}
                  <span className="font-medium text-slate-100">{report.viewedByName || "Not yet viewed"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Viewed at:</span>{" "}
                  <span className="font-medium text-slate-100">{getDateLabel(report.viewedAt)}</span>
                </p>
                <p>
                  <span className="text-slate-500">Assigned dispatcher:</span>{" "}
                  <span className="font-medium text-slate-100">{report.dispatcherId || "Unassigned"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Suggested agency:</span>{" "}
                  <span className="font-medium text-slate-100">
                    {report.suggestedAgency || primarySuggestedAgency || "Not determined"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Assigned agency:</span>{" "}
                  <span className="font-medium text-slate-100">{report.assignedAgency || "Unassigned"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Assigned responder:</span>{" "}
                  <span className="font-medium text-slate-100">{report.responder || "Unassigned"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Reported at:</span>{" "}
                  <span className="font-medium text-slate-100">{getDateLabel(report.createdAt)}</span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-slate-100">Location</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <p className="font-medium text-slate-100">{report.locationText || "—"}</p>
                <p>
                  <span className="text-slate-500">Nearest landmark:</span>{" "}
                  <span className="font-medium text-slate-100">{report.landmark || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-500">People involved:</span>{" "}
                  <span className="font-medium text-slate-100">
                    {report.peopleInvolved != null ? report.peopleInvolved : "—"}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Coordinates:</span>{" "}
                  <span className="font-medium text-slate-100">
                    {report.latitude != null && report.longitude != null
                      ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
                      : "—"}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-100">Description</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                {report.description || "No description provided."}
              </p>
            </section>

            {isChoosingResponder ? (
              <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      Additional Details
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Expected follow-up fields for {getIncidentTypeName(report.incidentType).toLowerCase()}.
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-800/60 bg-amber-950/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-200">
                    Awaiting civilian response
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {expectedAdditionalFields.map((fieldLabel) => (
                    <div
                      key={fieldLabel}
                      className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2.5"
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {fieldLabel}
                      </p>
                      <p className="mt-2 text-sm text-slate-400">
                        Awaiting civilian follow-up.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-100">Photo</h3>
              {report.imageUrl ? (
                <img
                  src={report.imageUrl}
                  alt="Emergency report"
                  className="mt-3 max-h-[28rem] w-full rounded-xl border border-slate-800 object-contain bg-slate-950"
                />
              ) : (
                <p className="mt-3 text-sm text-slate-400">No photo attached.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
