'use client'

import React from 'react'
import Image from 'next/image'
import { Activity, Radio, ShieldCheck } from 'lucide-react'

interface Stat {
  label: string
  value: string | number
  highlight?: boolean
}

interface CommandBarProps {
  pageName: string
  description?: string
  statsCategory?: string
  stats?: Stat[]
  children?: React.ReactNode
}

export default function CommandBar({ pageName, description, statsCategory, stats = [], children }: CommandBarProps) {
  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-xl">
      {/* Brand & Page Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-black tracking-widest text-slate-100 uppercase truncate">
            {pageName}
          </span>
          {description && (
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest truncate mt-0.5">
              {description}
            </span>
          )}
        </div>
      </div>

      {/* Center Section: Vacant for density */}
      <div className="hidden md:flex flex-1" />

      {/* Right Section: Stats & Utility */}
      <div className="flex items-center gap-4">
        {stats.length > 0 && (
          <div className="hidden lg:flex flex-col items-end gap-1">
            {statsCategory && (
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none">
                {statsCategory}
              </span>
            )}
            <div className="flex items-center gap-4">
              {stats.map((stat, i) => (
                <div key={i} className="flex items-baseline gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">{stat.label}:</span>
                  <span className={`text-[11px] font-black tabular-nums ${stat.highlight ? 'text-primary-400' : 'text-slate-300'}`}>
                    {String(stat.value ?? '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
