'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Smartphone,
  ShieldCheck,
  Info,
  Server,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { subscribeToSmsGatewaySettings, type SmsGatewaySettings } from '@packages/firebase';

interface SmsGatewaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmsGatewaySettingsModal({ isOpen, onClose }: SmsGatewaySettingsModalProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTestSms, setSendingTestSms] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [gatewayBaseUrl, setGatewayBaseUrl] = useState('');
  const [gatewayUsername, setGatewayUsername] = useState('sms');
  const [gatewayPassword, setGatewayPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [simSlot, setSimSlot] = useState<number>(1);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'unconfigured' | 'error'>('unconfigured');
  const [lastPingAt, setLastPingAt] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load initial settings from API
  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/command-center/sms-gateway', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          console.warn('[sms-gateway] Non-JSON response received:', text.slice(0, 100));
        }

        if (data) {
          setEnabled(data.enabled ?? true);
          setGatewayBaseUrl(data.gatewayBaseUrl || '');
          setGatewayUsername(data.gatewayUsername || 'sms');
          setHasPassword(data.hasPassword ?? false);
          setGatewayPassword(data.hasPassword ? '••••••••' : '');
          setWebhookSecret(data.webhookSecret || '');
          setWebhookUrl(data.webhookUrl || '');
          setSimSlot(data.simSlot ?? 1);
          setStatus(data.status || 'unconfigured');
          setLastPingAt(data.lastPingAt || null);
          setLastConnectedAt(data.lastConnectedAt || null);
          setLastError(data.lastError || null);
        }
      }
    } catch (err) {
      console.error('Failed to load SMS gateway settings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      void loadSettings();
      setTestResult(null);
    }
  }, [isOpen, loadSettings]);

  // Real-time listener for live status updates from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToSmsGatewaySettings((settings: SmsGatewaySettings | null) => {
      if (settings) {
        if (settings.status) setStatus(settings.status);
        if (settings.lastError !== undefined) setLastError(settings.lastError);
      }
    });
    return () => unsubscribe();
  }, [isOpen]);

  const handleCopyWebhook = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerateSecret = () => {
    const randomSecret = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setWebhookSecret(randomSecret);
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setWebhookUrl(`${origin}/api/sms/inbound?token=${randomSecret}`);
    }
    toast.info('New webhook secret generated. Remember to save changes.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setTestResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/command-center/sms-gateway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          gatewayBaseUrl: gatewayBaseUrl.trim(),
          gatewayUsername: gatewayUsername.trim(),
          gatewayPassword: gatewayPassword.includes('••••') ? undefined : gatewayPassword.trim(),
          webhookSecret: webhookSecret.trim(),
          simSlot,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100) || res.statusText}`);
      }

      if (data.webhookRegistered) {
        toast.success('Settings saved & Inbound Webhook automatically registered with phone!');
      } else {
        toast.success('SMS Gateway settings saved successfully.');
      }
      if (data.settings) {
        setWebhookUrl(data.settings.webhookUrl || webhookUrl);
        setHasPassword(data.settings.hasPassword);
        if (data.settings.hasPassword && !gatewayPassword.trim()) {
          setGatewayPassword('••••••••');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to save SMS Gateway configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) return;
    setTesting(true);
    setTestResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/command-center/sms-gateway/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gatewayBaseUrl: gatewayBaseUrl.trim(),
          gatewayUsername: gatewayUsername.trim(),
          gatewayPassword: gatewayPassword.includes('••••') ? undefined : gatewayPassword.trim(),
          simSlot,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100) || res.statusText}`);
      }

      if (res.ok && data.success) {
        setStatus('connected');
        setLastError(null);
        setTestResult({
          success: true,
          message: data.message || `Device connected successfully (${data.latencyMs}ms).`,
          latencyMs: data.latencyMs,
        });
        toast.success('Connected to Android SMS Gateway!');
      } else {
        setStatus('error');
        setLastError(data.error);
        setTestResult({
          success: false,
          message: data.error || 'Unable to establish connection with Android SMS Gateway.',
          latencyMs: data.latencyMs,
        });
        toast.error('Connection test failed.');
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || 'Connection failed';
      setLastError(msg);
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!user || !testPhoneNumber.trim()) return;
    setSendingTestSms(true);
    setTestResult(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/command-center/sms-gateway/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gatewayBaseUrl: gatewayBaseUrl.trim(),
          gatewayUsername: gatewayUsername.trim(),
          gatewayPassword: gatewayPassword.includes('••••') ? undefined : gatewayPassword.trim(),
          simSlot,
          testPhoneNumber: testPhoneNumber.trim(),
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 100) || res.statusText}`);
      }

      if (res.ok && data.success) {
        setStatus('connected');
        setLastError(null);
        setTestResult({
          success: true,
          message: data.message || `Test SMS dispatched successfully to ${testPhoneNumber}.`,
          latencyMs: data.latencyMs,
        });
        toast.success(`Test SMS dispatched to ${testPhoneNumber}`);
      } else {
        setStatus('error');
        setLastError(data.error);
        setTestResult({
          success: false,
          message: data.error || 'Failed to dispatch test SMS.',
          latencyMs: data.latencyMs,
        });
        toast.error('Failed to send test SMS.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to send test SMS';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setSendingTestSms(false);
    }
  };

  if (!isOpen) return null;

  const statusBadge = {
    connected: { label: 'Connected', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
    disconnected: { label: 'Disconnected', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
    error: { label: 'Error', bg: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' },
    unconfigured: { label: 'Unconfigured', bg: 'bg-slate-700/50 text-slate-400 border-slate-600/40', dot: 'bg-slate-400' },
  }[status];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sms-gateway-title"
        className="relative flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400 border border-primary-500/30">
              <Radio size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="sms-gateway-title" className="text-lg font-semibold text-slate-100">
                  Android SMS Gateway Settings
                </h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.bg}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot} animate-pulse`} />
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your dedicated Android phone for automatic bidirectional emergency SMS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <RefreshCw size={24} className="animate-spin text-primary-400" />
              <p className="text-sm">Loading SMS Gateway settings…</p>
            </div>
          ) : (
            <form id="sms-gateway-form" onSubmit={handleSave} className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-slate-200">Enable SMS Gateway Integration</span>
                  <p className="text-xs text-slate-400">Allow sending and receiving civilian emergency SMS via Android device.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {/* Section 1: Phone HTTP Server (Outbound) */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <Smartphone size={17} className="text-primary-400" />
                  <h3 className="text-sm font-semibold text-slate-200">1. Android Device Connection (Sending SMS)</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Gateway Base URL / IP Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Server size={15} />
                      </div>
                      <input
                        type="url"
                        value={gatewayBaseUrl}
                        onChange={(e) => setGatewayBaseUrl(e.target.value)}
                        placeholder="http://192.168.1.50:8080 or https://..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        required={enabled}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Copy the HTTP server address shown on the home screen of the Android SMS Gateway app.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Gateway Login / Username
                    </label>
                    <input
                      type="text"
                      value={gatewayUsername}
                      onChange={(e) => setGatewayUsername(e.target.value)}
                      placeholder="sms"
                      className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Gateway Password / API Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={gatewayPassword}
                        onChange={(e) => setGatewayPassword(e.target.value)}
                        placeholder={hasPassword ? '•••••••• (Saved)' : 'Enter password'}
                        className="w-full px-3 py-2 pr-10 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Preferred SIM Card Slot
                    </label>
                    <select
                      value={simSlot}
                      onChange={(e) => setSimSlot(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    >
                      <option value={1}>SIM 1 (Default)</option>
                      <option value={2}>SIM 2</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Inbound Webhook (Receiving SMS) */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <ShieldCheck size={17} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">2. Inbound Webhook (Receiving SMS)</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Webhook URL (Paste into Android SMS Gateway App)
                      </label>
                      <button
                        type="button"
                        onClick={handleRegenerateSecret}
                        className="text-[11px] text-primary-400 hover:text-primary-300 inline-flex items-center gap-1"
                      >
                        <RefreshCw size={11} /> Regenerate Secret
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl || 'Save configuration first to generate webhook URL'}
                        className="flex-1 px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-300 select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyWebhook}
                        disabled={!webhookUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary-950/30 border border-primary-900/50 text-xs text-primary-200/90 leading-relaxed">
                    <Info size={16} className="text-primary-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <div>
                        <p className="font-semibold text-primary-200">How to connect the Android SMS Gateway App:</p>
                        <p className="text-slate-300 mt-0.5">
                          <strong>Cloud Mode (Recommended):</strong> In the Android app, toggle <strong>Cloud Server</strong> ON (keep default Server URL <code>https://api.sms-gate.app</code>). Tap <strong>Online</strong> to register. Copy the displayed <em>Gateway URL</em>, <em>Username</em>, and <em>Password</em> into Section 1 above.
                        </p>
                        <p className="text-slate-300 mt-1">
                          <strong>Local Mode (Same Wi-Fi):</strong> Toggle <strong>Local Server</strong> ON in the Android app. Copy the local address (e.g. <code>http://192.168.1.50:8080</code>) and set credentials in Section 1.
                        </p>
                      </div>
                      <div className="pt-1.5 border-t border-primary-900/40">
                        <p className="font-semibold text-primary-200">Inbound SMS Webhook Setup:</p>
                        <p className="text-slate-300 mt-0.5">
                          Webhooks in the Android SMS Gateway app are registered <strong>automatically via API</strong> when you click <strong>Save Settings</strong> below (no manual typing needed in the app!).
                        </p>
                        <p className="text-slate-300 mt-1">
                          If using Cloud Mode, you can also paste this Webhook URL into your dashboard at <a href="https://sms-gate.app" target="_blank" rel="noreferrer" className="text-primary-400 underline">sms-gate.app</a> under your device&apos;s Webhooks tab.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Diagnostic & Connection Testing */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <Activity size={17} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">3. Connection Diagnostics & Testing</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing || !gatewayBaseUrl.trim()}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
                      {testing ? 'Testing Connection…' : 'Test Phone Connection'}
                    </button>
                  </div>

                  {/* Send Test SMS */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Send a Test SMS to Verify Outbound Delivery
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={testPhoneNumber}
                        onChange={(e) => setTestPhoneNumber(e.target.value)}
                        placeholder="0917XXXXXXX or +63917XXXXXXX"
                        className="flex-1 px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary-500"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestSms}
                        disabled={sendingTestSms || !testPhoneNumber.trim() || !gatewayBaseUrl.trim()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
                      >
                        <Send size={13} className={sendingTestSms ? 'animate-pulse' : ''} />
                        {sendingTestSms ? 'Sending…' : 'Send Test SMS'}
                      </button>
                    </div>
                  </div>

                  {/* Test Results Output */}
                  {testResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                        testResult.success
                          ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                          : 'bg-red-950/40 border-red-800/60 text-red-200'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold">{testResult.success ? 'Success' : 'Connection Error'}</p>
                        <p className="mt-0.5">{testResult.message}</p>
                      </div>
                    </div>
                  )}

                  {/* Health summary */}
                  {(lastPingAt || lastConnectedAt || lastError) && (
                    <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      {lastConnectedAt && (
                        <span>Last Connected: {new Date(lastConnectedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                      )}
                      {lastPingAt && (
                        <span>Last Checked: {new Date(lastPingAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            Close
          </button>
          <button
            type="submit"
            form="sms-gateway-form"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 rounded-lg transition shadow-lg shadow-primary-900/30 disabled:opacity-50"
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
            {saving ? 'Saving Changes…' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
