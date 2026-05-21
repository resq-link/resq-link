'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { LayoutDashboard, Users, Radio, Building2, LogOut, Headset } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dispatchers', label: 'Dispatchers', icon: Headset },
  { href: '/responders', label: 'Responders', icon: Radio },
  { href: '/civilians', label: 'Civilians', icon: Users },
  { href: '/command-centers', label: 'Command Centers', icon: Building2 },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAdmin, signOut } = useAdminAuth();

  if (pathname === '/login') {
    return null;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-100">
            RESQ-Link Super Admin
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600/90 text-white'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 truncate max-w-[180px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-red-300 hover:bg-slate-800/80 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
