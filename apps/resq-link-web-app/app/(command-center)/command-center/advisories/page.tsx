'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Radio,
  Send,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Archive,
  Trash2,
  Users,
  Smartphone,
  Eye,
  RefreshCw,
} from 'lucide-react';
import CommandBar from '@/components/CommandBar';
import {
  AdvisoryRecord,
  AdvisorySeverity,
  AdvisoryCategory,
  CreateAdvisoryInput,
  createAdvisory,
  archiveAdvisory,
  expireAdvisory,
  deleteAdvisory,
  subscribeToAdvisories,
  ADVISORY_CATEGORIES,
  ADVISORY_SEVERITIES,
} from '@packages/firebase';
import { useAuth } from '@/contexts/AuthContext';
import CreateAdvisoryModal from '@/components/advisories/CreateAdvisoryModal';
import BroadcastConfirmModal from '@/components/advisories/BroadcastConfirmModal';

type TabType = 'active' | 'draft' | 'archived' | 'all';

export default function AdvisoriesPage() {
  const { user } = useAuth();
  const [advisories, setAdvisories] = useState<AdvisoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [broadcastingAdvisory, setBroadcastingAdvisory] = useState<AdvisoryRecord | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to advisories in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToAdvisories(
      (data) => {
        setAdvisories(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('Failed to subscribe to advisories:', error);
        setIsLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Stats
  const activeCount = useMemo(
    () => advisories.filter((a) => a.status === 'active').length,
    [advisories]
  );
  const totalBroadcasts = useMemo(
    () => advisories.filter((a) => a.pushNotification?.sent).length,
    [advisories]
  );
  const totalRecipientsReached = useMemo(
    () =>
      advisories.reduce(
        (sum, a) => sum + (a.pushNotification?.successCount || 0),
        0
      ),
    [advisories]
  );

  // Filtered Advisories
  const filteredAdvisories = useMemo(() => {
    return advisories.filter((a) => {
      // Tab filter
      if (activeTab === 'active' && a.status !== 'active') return false;
      if (activeTab === 'draft' && a.status !== 'draft') return false;
      if (activeTab === 'archived' && a.status !== 'archived' && a.status !== 'expired') return false;

      // Severity filter
      if (selectedSeverity !== 'all' && a.severity !== selectedSeverity) return false;

      // Category filter
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchSummary = a.summary.toLowerCase().includes(q);
        const matchBarangays = a.targetBarangays?.some((b) => b.toLowerCase().includes(q));
        if (!matchTitle && !matchSummary && !matchBarangays) return false;
      }

      return true;
    });
  }, [advisories, activeTab, selectedSeverity, selectedCategory, searchQuery]);

  // Broadcast Push via API
  const handleBroadcastPush = async (advisoryId: string) => {
    setIsBroadcasting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/command-center/advisories/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ advisoryId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send broadcast');
      }

      showToast(
        data.message || `Push broadcast transmitted to ${data.successCount} civilian device(s).`
      );
      setBroadcastingAdvisory(null);
    } catch (error) {
      console.error('Broadcast failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to broadcast push notification');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Create & Publish
  const handleCreateAdvisory = async (
    input: CreateAdvisoryInput,
    broadcastImmediately: boolean
  ) => {
    setIsCreating(true);
    try {
      const newId = await createAdvisory({
        ...input,
        createdBy: {
          uid: user?.uid || '',
          name: user?.displayName || user?.email?.split('@')[0] || 'Command Center Staff',
          email: user?.email || '',
        },
      });

      if (broadcastImmediately) {
        await handleBroadcastPush(newId);
      } else {
        showToast('Public advisory saved successfully.');
      }

      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create advisory:', error);
      alert(error instanceof Error ? error.message : 'Could not create advisory');
    } finally {
      setIsCreating(false);
    }
  };

  // Status Handlers
  const handleExpire = async (id: string) => {
    try {
      await expireAdvisory(id);
      showToast('Advisory marked as expired.');
    } catch (err) {
      console.error(err);
      alert('Failed to expire advisory');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveAdvisory(id);
      showToast('Advisory archived.');
    } catch (err) {
      console.error(err);
      alert('Failed to archive advisory');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this advisory?')) return;
    try {
      await deleteAdvisory(id);
      showToast('Advisory deleted.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete advisory');
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'No expiry';
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 border border-emerald-500/40 p-4 text-xs font-semibold text-emerald-300 shadow-2xl shadow-black flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top CommandBar */}
      <CommandBar
        pageName="Public Advisories"
        description="Public alerts & mass mobile push notification broadcasts"
        statsCategory="Advisories & Reach"
        stats={[
          { label: 'Active Alerts', value: activeCount, highlight: activeCount > 0 },
          { label: 'Total Broadcasts', value: totalBroadcasts },
          { label: 'Devices Reached', value: totalRecipientsReached },
        ]}
      >
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-900/40 hover:bg-primary-500 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Advisory</span>
        </button>
      </CommandBar>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar no-scrollbar">
        {/* Controls Strip: Tabs, Search & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
            {(
              [
                { key: 'active', label: 'Active Broadcasts', count: activeCount },
                { key: 'draft', label: 'Drafts', count: undefined },
                { key: 'archived', label: 'Archived / Expired', count: undefined },
                { key: 'all', label: 'All Notices', count: advisories.length },
              ] as { key: TabType; label: string; count?: number }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-slate-100 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${
                      activeTab === tab.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search advisories, keywords, or barangays..."
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-medium text-slate-300 focus:border-primary-500 outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical</option>
              <option value="severe">🟠 Severe</option>
              <option value="moderate">🟡 Moderate</option>
              <option value="info">🔵 Info</option>
            </select>
          </div>
        </div>

        {/* Advisories Grid / List */}
        {isLoading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-16 text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-primary-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Loading public advisories...</p>
          </div>
        ) : filteredAdvisories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-16 text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-500">
              <Megaphone className="w-6 h-6" />
            </div>
            <p className="text-slate-200 text-base font-bold">No public advisories found</p>
            <p className="text-slate-500 text-xs mt-1.5 max-w-sm mx-auto">
              {activeTab === 'active'
                ? 'There are no active emergency advisories broadcasting right now.'
                : 'No advisories match your current search or tab criteria.'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create First Advisory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAdvisories.map((advisory) => {
              const severityMeta =
                ADVISORY_SEVERITIES[advisory.severity] || ADVISORY_SEVERITIES.info;
              const categoryMeta =
                ADVISORY_CATEGORIES[advisory.category] || ADVISORY_CATEGORIES.general;

              return (
                <div
                  key={advisory.id}
                  className={`rounded-2xl border ${
                    advisory.status === 'active' ? severityMeta.border : 'border-slate-800'
                  } bg-slate-900/70 p-5 shadow-lg shadow-black/30 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all`}
                >
                  {/* Card Top: Badges & Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityMeta.badgeBg} ${severityMeta.badgeText} border ${severityMeta.border}`}
                        >
                          {severityMeta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700/60">
                          {categoryMeta.label}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          advisory.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : advisory.status === 'draft'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                        }`}
                      >
                        {advisory.status}
                      </span>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                        {advisory.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                        {advisory.summary}
                      </p>
                    </div>

                    {/* Scope & Target Area */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {advisory.targetScope === 'all'
                          ? 'City-wide (All Civilians)'
                          : `Barangays: ${advisory.targetBarangays?.join(', ') || 'Custom area'}`}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Push Stats & Action Strip */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-3">
                    {/* Push stats pill */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 rounded-xl p-2.5 border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                        <span>Push Broadcast:</span>
                      </div>

                      {advisory.pushNotification?.sent ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{advisory.pushNotification.successCount} sent</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium">Not broadcast yet</span>
                      )}
                    </div>

                    {/* Timing */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Issued: {formatDate(advisory.createdAt)}</span>
                      <span>Expires: {formatDate(advisory.expiresAt)}</span>
                    </div>

                    {/* Actions Button Row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setBroadcastingAdvisory(advisory)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600/90 to-amber-600/90 hover:from-red-500 hover:to-amber-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-red-950/50 transition-all cursor-pointer"
                      >
                        <Radio className="h-3.5 w-3.5" />
                        <span>{advisory.pushNotification?.sent ? 'Re-broadcast Push' : 'Broadcast Push'}</span>
                      </button>

                      {advisory.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleExpire(advisory.id)}
                          title="Expire advisory"
                          className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleArchive(advisory.id)}
                        title="Archive advisory"
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
                      >
                        <Archive className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(advisory.id)}
                        title="Delete permanently"
                        className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateAdvisoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAdvisory}
        isLoading={isCreating}
      />

      <BroadcastConfirmModal
        isOpen={!!broadcastingAdvisory}
        advisory={broadcastingAdvisory}
        isLoading={isBroadcasting}
        onConfirm={async () => {
          if (broadcastingAdvisory) {
            await handleBroadcastPush(broadcastingAdvisory.id);
          }
        }}
        onClose={() => setBroadcastingAdvisory(null)}
      />
    </div>
  );
}
