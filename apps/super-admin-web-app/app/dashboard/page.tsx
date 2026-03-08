'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { Users, Radio, Building2, Shield } from 'lucide-react';

const cards = [
  { href: '/responders', label: 'Responders', icon: Radio, desc: 'Create and manage responder (dispatcher) accounts' },
  { href: '/civilians', label: 'Civilians', icon: Users, desc: 'Create and manage civilian user accounts' },
  { href: '/command-centers', label: 'Command Centers', icon: Building2, desc: 'Create and manage command center accounts' },
];

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600/20 text-primary-400 border border-primary-500/30">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Super Admin Dashboard</h1>
            <p className="text-slate-400">Manage accounts for responders, civilians, and command centers</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="block p-6 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800/60 hover:border-primary-500/40 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600/20 text-primary-400 mb-4 group-hover:bg-primary-500/30">
                  <Icon size={22} />
                </div>
                <h2 className="text-lg font-semibold text-slate-100 mb-2">{card.label}</h2>
                <p className="text-sm text-slate-400">{card.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </ProtectedRoute>
  );
}
