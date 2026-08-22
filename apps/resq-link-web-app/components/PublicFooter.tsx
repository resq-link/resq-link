import Image from 'next/image'
import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="relative z-10 border-t border-slate-800/80 bg-[#080d0b]/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.3fr_.7fr_.7fr] lg:px-10">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="RESQ-Link home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-400/25 bg-slate-900">
              <Image src="/branding/resq-link-icon.png" alt="" width={24} height={24} />
            </span>
            <span><span className="block text-base font-semibold text-white">RESQ-Link</span><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-400">Emergency response</span></span>
          </Link>
          <p className="mt-4 text-sm leading-6 text-slate-500">A connected emergency-response system for receiving reports, coordinating teams, and tracking response activity in real time.</p>
          <p className="mt-5 text-sm font-medium text-slate-300">Developed by St. Paul University Philippines<br /><span className="text-slate-500">Institutional Innovations</span></p>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Platform</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500"><li><Link href="/login" className="transition hover:text-primary-300">Sign in</Link></li><li><Link href="/#capabilities" className="transition hover:text-primary-300">Capabilities</Link></li><li><Link href="/contact" className="transition hover:text-primary-300">Contact us</Link></li></ul>
        </div>
        <div>
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Legal</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500"><li><Link href="/privacy-policy" className="transition hover:text-primary-300">Privacy policy</Link></li><li><Link href="/data-privacy" className="transition hover:text-primary-300">Data privacy notice</Link></li><li><Link href="/terms-of-use" className="transition hover:text-primary-300">Terms of use</Link></li></ul>
        </div>
      </div>
      <div className="border-t border-slate-800/80 px-5 py-5 text-center text-xs text-slate-600">© {new Date().getFullYear()} RESQ-Link. All rights reserved.</div>
    </footer>
  )
}
