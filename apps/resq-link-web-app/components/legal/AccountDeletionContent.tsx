'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, Send, ShieldAlert, Trash2 } from 'lucide-react'
import LegalSection from './LegalSection'

export default function AccountDeletionContent() {
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [accountType, setAccountType] = useState('civilian')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!emailOrPhone.trim()) {
      setError('Please provide your registered email address or mobile phone number.')
      return
    }
    if (!confirmed) {
      setError('Please confirm that you understand the account deletion terms.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/accounts/request-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: emailOrPhone.trim(),
          accountType,
          reason: reason.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit account deletion request.')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting your request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 text-sm leading-relaxed text-slate-300">
      <LegalSection title="1. Overview & Policy">
        <p>
          In accordance with Google Play Store policies and data privacy regulations, RESQ-Link provides users with the ability to request the permanent deletion of their account and associated personal data.
        </p>
        <p className="mt-3">
          You can request account deletion directly through this online portal without needing to reinstall the mobile application.
        </p>
      </LegalSection>

      <LegalSection title="2. What Data Is Deleted">
        <p>Upon verification and processing of your account deletion request, the following data is permanently purged from our servers:</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-400">
          <li><strong>Authentication Credentials:</strong> Your login account, email address, password hashes, and active sessions.</li>
          <li><strong>Personal Demographics:</strong> Your registered full name, contact numbers, residential address, and emergency contact records.</li>
          <li><strong>Identity Verification (KYC) Media:</strong> Uploaded government ID photos, selfie verification images, and verification review logs.</li>
          <li><strong>Device & Push Notification Tokens:</strong> Registered Expo push tokens and notification settings.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Retention for Legal & Public Safety Compliance">
        <p>
          As an emergency response and public safety platform, official incident records (such as completed emergency dispatch logs and anonymized operational time logs) may be retained in historical archives for municipal reporting, legal audit requirements, and public safety oversight. All personal identifying information is scrubbed and decoupled from these operational archives.
        </p>
      </LegalSection>

      <LegalSection title="4. How to Delete Within the Mobile App">
        <p>If you currently have the mobile application installed, you can also initiate account deletion directly:</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-400">
          <li>Open the <strong>RESQ-Link</strong> mobile app and log in to your account.</li>
          <li>Navigate to the <strong>Profile / Settings</strong> tab.</li>
          <li>Scroll to the <strong>Privacy & Security</strong> section and tap <strong>Delete Account & Data</strong>.</li>
          <li>Confirm your password to authorize immediate account removal.</li>
        </ol>
      </LegalSection>

      <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 sm:p-8">
        <div className="flex items-center gap-3 text-red-400">
          <Trash2 className="h-6 w-6 shrink-0" />
          <h2 className="text-lg font-semibold text-white">Online Account Deletion Request</h2>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Submit your account details below. Our security team will verify your identity and process the deletion within 48 hours.
        </p>

        {success ? (
          <div className="mt-6 rounded-xl border border-primary-500/30 bg-primary-950/40 p-5 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/20 text-primary-400">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">Deletion Request Received</h3>
            <p className="mt-2 text-xs text-slate-300">
              We have received your account deletion request for <strong className="text-white">{emailOrPhone}</strong>. A confirmation notice will be processed, and your personal data will be purged.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/50 px-4 py-3 text-xs text-red-300">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Registered Email or Mobile Phone Number *
              </label>
              <input
                id="identifier"
                type="text"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="e.g. user@example.com or +639123456789"
                className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label htmlFor="accountType" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Account Type
              </label>
              <select
                id="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="civilian">Civilian User Account (Mobile App)</option>
                <option value="responder">Field Responder Account</option>
                <option value="other">Other / General Inquiry</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Reason for deletion (Optional)
              </label>
              <textarea
                id="reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Let us know if you experienced any issues or have feedback..."
                className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="confirm"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500"
              />
              <label htmlFor="confirm" className="text-xs text-slate-400">
                I understand that deleting my account will permanently remove my profile, emergency reporting history, and KYC verification records.
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting request...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Account Deletion Request</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <LegalSection title="5. Direct Privacy Support">
        <p>
          For urgent data removal requests or questions regarding our data retention practices, you may directly contact our Data Protection Officer:
        </p>
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-200">RESQ-Link Data Protection & Privacy Office</p>
          <p className="mt-1">Email: <a href="mailto:privacy@resq-link.com" className="text-primary-400 underline">privacy@resq-link.com</a> / <a href="mailto:support@resq-link.com" className="text-primary-400 underline">support@resq-link.com</a></p>
          <p className="mt-0.5">Primary Service Area: Tuguegarao City, Cagayan, Philippines</p>
        </div>
      </LegalSection>
    </div>
  )
}
