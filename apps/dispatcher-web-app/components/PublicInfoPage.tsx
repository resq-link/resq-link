import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PublicFooter from './PublicFooter'

type PublicInfoPageProps = { eyebrow: string; title: string; description: string; children: React.ReactNode }

export default function PublicInfoPage({ eyebrow, title, description, children }: PublicInfoPageProps) {
  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[#080d0b] text-slate-100">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3" aria-label="RESQ-Link home"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-400/25 bg-slate-900"><Image src="/branding/resq-link-icon.png" alt="" width={24} height={24} /></span><span><span className="block text-base font-semibold text-white">RESQ-Link</span><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-400">Emergency response</span></span></Link>
        <Link href="/login" className="rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-primary-400">Sign in</Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-14 sm:px-8 sm:pt-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-primary-300"><ArrowLeft size={16} /> Back to home</Link>
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.2em] text-primary-400">{eyebrow}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">{description}</p>
        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 leading-7 text-slate-400 sm:p-8">{children}</div>
      </main>
      <PublicFooter />
    </div>
  )
}
