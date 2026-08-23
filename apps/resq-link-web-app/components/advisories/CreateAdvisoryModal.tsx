'use client';

import React, { useState } from 'react';
import {
  X,
  Radio,
  Send,
  Bell,
  AlertTriangle,
  Flame,
  CloudRain,
  Waves,
  AlertOctagon,
  Car,
  HeartPulse,
  Users,
  Megaphone,
  Smartphone,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
} from 'lucide-react';
import {
  AdvisoryCategory,
  AdvisorySeverity,
  AdvisoryTargetScope,
  CreateAdvisoryInput,
  ADVISORY_CATEGORIES,
  ADVISORY_SEVERITIES,
} from '@packages/firebase';

interface CreateAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAdvisoryInput, broadcastImmediately: boolean) => Promise<void>;
  isLoading: boolean;
}

const BARANGAY_OPTIONS = [
  'San Jose',
  'Santa Cruz',
  'Poblacion',
  'San Roque',
  'Santo Niño',
  'Bagong Silang',
  'Concepcion',
  'San Miguel',
  'Malanday',
  'Bayanihan',
];

const PRESET_EXPIRY = [
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours', hours: 24 },
  { label: '48 Hours', hours: 48 },
  { label: 'No Expiry', hours: 0 },
];

export default function CreateAdvisoryModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: CreateAdvisoryModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<AdvisoryCategory>('weather');
  const [severity, setSeverity] = useState<AdvisorySeverity>('moderate');
  const [targetScope, setTargetScope] = useState<AdvisoryTargetScope>('all');
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [broadcastImmediately, setBroadcastImmediately] = useState<boolean>(true);
  const [previewTab, setPreviewTab] = useState<'lockscreen' | 'inapp'>('lockscreen');

  if (!isOpen) return null;

  const toggleBarangay = (b: string) => {
    setSelectedBarangays((prev) =>
      prev.includes(b) ? prev.filter((item) => item !== b) : [...prev, b]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim() || !content.trim()) return;

    let expiresAt: Date | null = null;
    if (expiryHours > 0) {
      expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    }

    const payload: CreateAdvisoryInput = {
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim(),
      category,
      severity,
      status: 'active',
      targetScope,
      targetBarangays: targetScope === 'barangay' ? selectedBarangays : [],
      effectiveAt: new Date(),
      expiresAt,
    };

    await onSubmit(payload, broadcastImmediately);
  };

  const severityMeta = ADVISORY_SEVERITIES[severity] || ADVISORY_SEVERITIES.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Create Public Advisory</h2>
              <p className="text-xs text-slate-400">Broadcast official alerts to all civilian mobile apps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Grid: Form (Left) & Mobile Simulator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1 custom-scrollbar">
          {/* Left Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 space-y-5 border-r border-slate-800">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Advisory Headline / Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Flash Flood Warning: Level 3 Evacuation Alert"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
            </div>

            {/* Severity & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Urgency / Severity Level
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as AdvisorySeverity)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all cursor-pointer"
                >
                  <option value="critical">🔴 Critical Alert (Red)</option>
                  <option value="severe">🟠 Severe Warning (Orange)</option>
                  <option value="moderate">🟡 Moderate Warning (Yellow)</option>
                  <option value="info">🔵 Informational Notice (Cyan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AdvisoryCategory)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all cursor-pointer"
                >
                  {Object.entries(ADVISORY_CATEGORIES).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Scope */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Target Broadcast Audience
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetScope('all')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition-all ${
                    targetScope === 'all'
                      ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Radio className="h-4 w-4" />
                  All Civilians (City-wide)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetScope('barangay')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold border transition-all ${
                    targetScope === 'barangay'
                      ? 'bg-primary-600/20 border-primary-500 text-primary-300 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  Target Specific Barangays
                </button>
              </div>

              {targetScope === 'barangay' && (
                <div className="mt-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <p className="text-[11px] text-slate-400 font-medium">Select affected barangays:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BARANGAY_OPTIONS.map((b) => {
                      const isSelected = selectedBarangays.includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => toggleBarangay(b)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {b} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Push Notification Summary */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Push Notification Summary / Lockscreen Text <span className="text-red-400">*</span>
                </label>
                <span
                  className={`text-[11px] font-mono ${
                    summary.length > 140 ? 'text-amber-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  {summary.length}/150
                </span>
              </div>
              <textarea
                required
                maxLength={150}
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Short teaser sent directly to civilian phone lockscreens (max 150 chars)..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all resize-none"
              />
            </div>

            {/* Detailed Content */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Detailed Public Notice & Safety Guidelines <span className="text-red-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Full advisory instructions, emergency action steps, designated evacuation shelters, hotline contact numbers..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
            </div>

            {/* Validity Presets */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Active Validity Duration
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_EXPIRY.map((item) => (
                  <button
                    key={item.hours}
                    type="button"
                    onClick={() => setExpiryHours(item.hours)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      expiryHours === item.hours
                        ? 'bg-slate-200 text-slate-950 border-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Immediate Broadcast Toggle */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Send Push Notification Immediately</p>
                  <p className="text-[11px] text-slate-400">Broadcasts to civilian devices as soon as published</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={broadcastImmediately}
                  onChange={(e) => setBroadcastImmediately(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </form>

          {/* Right Live Simulation Preview */}
          <div className="lg:col-span-5 p-6 bg-slate-950/60 flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Mobile Simulator
                </span>
              </div>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setPreviewTab('lockscreen')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    previewTab === 'lockscreen'
                      ? 'bg-slate-800 text-slate-100 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Lockscreen
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('inapp')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    previewTab === 'inapp'
                      ? 'bg-slate-800 text-slate-100 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  In-App Banner
                </button>
              </div>
            </div>

            {/* Mobile Mock Container */}
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-[280px] rounded-[32px] border-[6px] border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col min-h-[440px] relative">
                {/* Phone Speaker Notch */}
                <div className="w-20 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>

                {previewTab === 'lockscreen' ? (
                  /* Lockscreen View */
                  <div className="p-3 flex-1 flex flex-col justify-center space-y-4">
                    <div className="text-center text-slate-400 space-y-0.5">
                      <p className="text-2xl font-light text-slate-200 tracking-tight">09:41</p>
                      <p className="text-[10px] uppercase font-medium tracking-wider">Tuesday, August 24</p>
                    </div>

                    {/* Push Notification Banner Card */}
                    <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-3 shadow-xl backdrop-blur-md space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-md bg-red-600 flex items-center justify-center text-[9px] font-bold text-white">
                            R
                          </div>
                          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-tight">
                            RESQ-LINK ALERT
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400">now</span>
                      </div>

                      <p className="text-[11px] font-bold text-slate-100 leading-snug">
                        {title.trim()
                          ? `${severity === 'critical' ? '🚨 ' : ''}${title.trim()}`
                          : '🚨 [CRITICAL ADVISORY] Flash Flood Warning'}
                      </p>
                      <p className="text-[10px] text-slate-300 leading-normal line-clamp-3">
                        {summary.trim() ||
                          'High water levels reported. Evacuate low-lying zones immediately.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* In-App Banner View */
                  <div className="p-3 flex-1 space-y-3">
                    {/* Simulated Civilian App Header */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-bold text-slate-300">RESQ-Link Civilian</span>
                      <Bell className="h-3.5 w-3.5 text-slate-400" />
                    </div>

                    {/* Active Advisory Card */}
                    <div
                      className={`rounded-xl border ${severityMeta.border} ${severityMeta.bgSoft} p-3 space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${severityMeta.badgeBg} ${severityMeta.badgeText}`}
                        >
                          {severityMeta.label}
                        </span>
                        <span className="text-[9px] text-slate-400">Active Alert</span>
                      </div>

                      <h5 className="text-xs font-bold text-slate-100 leading-tight">
                        {title.trim() || 'Flash Flood Warning'}
                      </h5>
                      <p className="text-[10px] text-slate-300 line-clamp-2">
                        {summary.trim() || 'Evacuate low-lying zones and monitor emergency broadcasts.'}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-primary-400 font-semibold">
                        <span>View Guidelines & Map</span>
                        <span>→</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Home Indicator Bar */}
                <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mb-2 mt-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-6 py-4 sticky bottom-0 z-10">
          <div className="text-xs text-slate-400">
            {broadcastImmediately ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Send className="h-3.5 w-3.5" /> Will trigger mass push notifications upon submission
              </span>
            ) : (
              <span className="text-slate-500">Will save without immediate push notification</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !summary.trim() || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary-900/40 hover:bg-primary-500 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Publishing Advisory...
                </>
              ) : (
                <>
                  <Megaphone className="h-4 w-4" />
                  Publish & Broadcast Advisory
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
