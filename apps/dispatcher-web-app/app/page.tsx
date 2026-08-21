import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Radio,
  ShieldCheck,
  Siren,
  UsersRound,
} from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'

const capabilities = [
  {
    icon: Radio,
    title: 'Live incident intake',
    description: 'Bring incoming reports, voice requests, and field updates into one operational view.',
  },
  {
    icon: MapPin,
    title: 'A clearer operational picture',
    description: 'Locate emergencies, resources, and teams quickly with a shared map built for the moment.',
  },
  {
    icon: UsersRound,
    title: 'Teams that move together',
    description: 'Coordinate assignments and handoffs with the context every responder needs to act.',
  },
]

export default function Home() {
  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden bg-[#080d0b] text-slate-100">
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="landing-orb landing-orb-one pointer-events-none absolute" />
      <div className="landing-orb landing-orb-two pointer-events-none absolute" />

      <header className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" className="group flex items-center gap-3" aria-label="RESQ-Link home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-400/25 bg-slate-900/80 shadow-lg shadow-emerald-950/30 transition-transform duration-300 group-hover:scale-105">
            <Image src="/branding/resq-link-icon.png" alt="" width={28} height={28} priority />
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-semibold tracking-tight text-white">RESQ-Link</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.21em] text-primary-400">Emergency response</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white sm:inline-flex">
            Sign in
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-primary-400/30 bg-primary-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-primary-950/40 transition duration-300 hover:-translate-y-0.5 hover:bg-primary-400 hover:shadow-primary-500/20">
            Command center <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-12 sm:px-8 sm:pt-20 lg:px-10 lg:pb-24 lg:pt-24">
        <section className="grid items-center gap-14 lg:grid-cols-[1.04fr_.96fr] lg:gap-10">
          <div className="landing-reveal max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-400/15 bg-primary-400/[0.08] px-3.5 py-2 text-xs font-medium text-primary-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-400" />
              </span>
              Connected response, when every second matters
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">
              Turn urgent moments into <span className="text-primary-400">coordinated action.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400 sm:text-xl">
              RESQ-Link gives command teams a calm, live view of emergency response—from the first report to a safer resolution.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-primary-950/40 transition duration-300 hover:-translate-y-0.5 hover:bg-primary-400">
                Sign in to RESQ-Link <ArrowRight size={17} />
              </Link>
              <a href="#capabilities" className="inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-3.5 text-sm font-semibold text-slate-300 transition hover:text-white">
                Explore the platform <ChevronRight size={17} />
              </a>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
              {['Live awareness', 'Role-based access', 'Built for local response'].map((item) => (
                <span key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-primary-400" />{item}</span>
              ))}
            </div>
          </div>

          <div className="landing-dashboard landing-reveal-delayed relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="absolute -inset-5 rounded-[2.25rem] bg-primary-500/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.65rem] border border-slate-700/70 bg-slate-900/85 p-3 shadow-2xl shadow-black/45 backdrop-blur-xl sm:p-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-700/55 bg-slate-950/70 px-4 py-3">
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400"><Activity size={16} /></span><span><span className="block text-sm font-semibold text-slate-100">Command overview</span><span className="text-xs text-slate-500">Tuguegarao City • Live</span></span></div>
                <span className="rounded-full bg-primary-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-300">Online</span>
              </div>
              <div className="mt-3 grid grid-cols-[1.25fr_.75fr] gap-3">
                <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between"><p className="text-xs font-medium text-slate-500">Response map</p><MapPin size={15} className="text-primary-400" /></div>
                  <div className="landing-map mt-4 h-44 overflow-hidden rounded-lg border border-primary-400/10 bg-[#0c1713] p-3">
                    <span className="landing-route route-one" /><span className="landing-route route-two" />
                    <span className="landing-marker marker-one"><Siren size={12} /></span><span className="landing-marker marker-two" /><span className="landing-marker marker-three" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500"><span>3 units en route</span><span className="text-primary-300">Map synced</span></div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-3.5"><span className="text-[10px] font-bold uppercase tracking-wider text-red-300">Priority alert</span><p className="mt-2 text-sm font-semibold text-slate-100">Medical assistance</p><p className="mt-1 text-xs text-slate-500">Unit 04 acknowledged</p></div>
                  <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-3.5"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active units</span><p className="mt-1 text-2xl font-semibold text-white">12 <span className="text-xs font-medium text-primary-400">available</span></p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full w-3/4 rounded-full bg-primary-500" /></div></div>
                </div>
              </div>
            </div>
            <div className="landing-float-card absolute -bottom-7 -left-5 hidden items-center gap-3 rounded-xl border border-slate-700/70 bg-slate-900/90 px-4 py-3 shadow-xl shadow-black/30 backdrop-blur-xl sm:flex"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400"><ShieldCheck size={18} /></span><span><span className="block text-xs text-slate-500">Status</span><span className="text-sm font-semibold text-slate-100">Response coordinated</span></span></div>
          </div>
        </section>

        <section id="capabilities" className="relative mt-28 border-t border-slate-800/80 pt-12 sm:mt-36 sm:pt-16">
          <div className="mb-10 max-w-xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-400">One response network</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built to keep people and information moving.</h2></div>
          <div className="grid gap-4 md:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, description }, index) => <article key={title} className="landing-capability rounded-2xl border border-slate-800 bg-slate-900/45 p-6 transition duration-300 hover:-translate-y-1 hover:border-primary-500/35 hover:bg-slate-900/75" style={{ animationDelay: `${index * 110}ms` }}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500/10 text-primary-400"><Icon size={21} /></span><h3 className="mt-5 text-lg font-semibold text-slate-100">{title}</h3><p className="mt-2.5 text-sm leading-6 text-slate-400">{description}</p></article>)}
          </div>
        </section>

        <section className="relative mt-24 overflow-hidden rounded-3xl border border-primary-400/15 bg-primary-500/[0.07] px-6 py-10 sm:mt-32 sm:px-10 sm:py-14">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-7 md:flex-row md:items-end"><div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-400">An end-to-end response system</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">From public reporting to coordinated field response.</h2><p className="mt-4 text-sm leading-6 text-slate-400">RESQ-Link connects the civilian reporting experience, command-center operations, and field-responder workflows through a shared emergency-response network.</p></div><Link href="/contact" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary-400/30 bg-slate-950/60 px-5 py-3 text-sm font-semibold text-primary-300 transition hover:border-primary-400/60 hover:bg-slate-900">Contact us <ArrowRight size={16} /></Link></div>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
