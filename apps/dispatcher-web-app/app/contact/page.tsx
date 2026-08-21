import { Mail, MessageSquare } from 'lucide-react'
import PublicInfoPage from '@/components/PublicInfoPage'

export default function ContactPage() {
  return <PublicInfoPage eyebrow="Get in touch" title="Contact the RESQ-Link team" description="For platform support, partnership inquiries, or questions about RESQ-Link, send us a message and the appropriate team will follow up.">
    <div className="grid gap-5 sm:grid-cols-2"><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5"><Mail className="text-primary-400" size={21} /><h2 className="mt-4 font-semibold text-slate-100">Platform support</h2><p className="mt-2 text-sm leading-6">Contact details will be published here when support channels are finalized.</p></div><div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5"><MessageSquare className="text-primary-400" size={21} /><h2 className="mt-4 font-semibold text-slate-100">Institutional inquiries</h2><p className="mt-2 text-sm leading-6">Developed by St. Paul University Philippines Institutional Innovations.</p></div></div>
    <p className="mt-7 text-sm">This contact page is a placeholder while official support details and service hours are confirmed.</p>
  </PublicInfoPage>
}
