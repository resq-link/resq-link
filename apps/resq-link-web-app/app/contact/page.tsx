import { Mail, MessageSquare, Shield } from 'lucide-react'
import PublicInfoPage from '@/components/PublicInfoPage'

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Get in touch"
      title="Contact the RESQ-Link team"
      description="For platform support, privacy requests, or institutional inquiries about RESQ-Link."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
          <Mail className="text-primary-400" size={21} />
          <h2 className="mt-4 font-semibold text-slate-100">Platform support</h2>
          <p className="mt-2 text-sm leading-6">
            Email{' '}
            <a href="mailto:mvgumabay@spup.edu.ph" className="text-primary-400 hover:underline">
              mvgumabay@spup.edu.ph
            </a>{' '}
            for account, verification, or general assistance.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
          <Shield className="text-primary-400" size={21} />
          <h2 className="mt-4 font-semibold text-slate-100">Privacy & data requests</h2>
          <p className="mt-2 text-sm leading-6">
            Data subject requests under the Philippine Data Privacy Act:{' '}
            <a href="mailto:mvgumabay@spup.edu.ph" className="text-primary-400 hover:underline">
              mvgumabay@spup.edu.ph
            </a>
            . See our{' '}
            <a href="/data-privacy" className="text-primary-400 hover:underline">
              data privacy notice
            </a>
            .
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 sm:col-span-2">
          <MessageSquare className="text-primary-400" size={21} />
          <h2 className="mt-4 font-semibold text-slate-100">Institutional inquiries</h2>
          <p className="mt-2 text-sm leading-6">
            Developed by St. Paul University Philippines Institutional Innovations in support of Tuguegarao City
            emergency-response coordination.
          </p>
        </div>
      </div>
    </PublicInfoPage>
  )
}
