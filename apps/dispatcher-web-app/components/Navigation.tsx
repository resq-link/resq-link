"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToFootageRequests, subscribeToEmergencyReports } from "@packages/firebase";
import AgentAssistant from "@/components/AgentAssistant";
import OperationalChatWidget from "@/components/OperationalChatWidget";
import {
  LayoutDashboard,
  Globe,
  ClipboardList,
  Video,
  BarChart2,
  Clock,
  Settings,
  Truck,
  Users,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  ShieldAlert,
} from "lucide-react";

type NavBadgeKey = "intakeCount" | "pendingFootageCount";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: NavBadgeKey;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "DASHBOARD",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/map", label: "Map", icon: Globe },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { href: "/intake", label: "Incident Intake", icon: ClipboardList, badgeKey: "intakeCount" as NavBadgeKey },
      { href: "/incidents", label: "Active Incidents", icon: ShieldAlert },
      { href: "/footage-requests", label: "Footage Requests", icon: Video, badgeKey: "pendingFootageCount" as NavBadgeKey },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { href: "/report", label: "Reports", icon: BarChart2 },
      { href: "/history", label: "Incident History", icon: Clock },
    ],
  },
  {
    title: "ADMINISTRATION",
    items: [
      { href: "/incident-management", label: "Incident Types", icon: Settings },
      { href: "/resources", label: "Resources", icon: Truck },
      { href: "/teams", label: "Teams", icon: Users },
    ],
  },
];

type NavigationProps = {
  children: React.ReactNode;
};

const BrandBlock = ({ compact = false, onNavigate }: { compact?: boolean, onNavigate?: () => void }) => (
  <Link
    href="/"
    className={`flex items-center gap-3 group shrink-0 rounded-lg outline-none ring-primary-500/40 focus-visible:ring-2 ${compact ? "min-w-0" : ""}`}
    aria-label="RESQ-Link Command - Home"
    onClick={onNavigate}
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900/80 border border-slate-700/60 shadow-inner group-hover:border-primary-500/40 transition-colors">
      <Image
        src="/branding/resq-link-icon.png"
        alt=""
        width={24}
        height={24}
        priority
        className="opacity-95"
      />
    </div>
    {!compact && (
      <div className="flex min-w-0 flex-col">
        <span className="text-lg font-semibold tracking-tight text-slate-100 truncate">
          RESQ-Link
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-400/90">
          Command Center
        </span>
      </div>
    )}
  </Link>
);

const UserMenu = ({ user, userMenuOpen, setUserMenuOpen, handleSignOut, alignUp = false }: { 
  user: any, 
  userMenuOpen: boolean, 
  setUserMenuOpen: (o: boolean) => void, 
  handleSignOut: () => void, 
  alignUp?: boolean 
}) =>
  user ? (
    <div className="relative" data-user-menu>
      <button
        data-user-trigger
        type="button"
        onClick={() => setUserMenuOpen(!userMenuOpen)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/60 min-w-0"
        aria-expanded={userMenuOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-primary-400 border border-primary-500/30">
          <User size={18} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-200">
            {user.email?.split("@")[0] || "User"}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            Command Center Admin
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {userMenuOpen && (
        <div
          className={`absolute left-0 right-0 z-50 mx-2 rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-xl shadow-black/20 backdrop-blur-xl py-1.5 ${
            alignUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          role="menu"
        >
          <div className="px-4 py-2.5 border-b border-slate-700/60">
            <p className="truncate text-sm font-medium text-slate-200">
              {user.email}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed in as command center admin
            </p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/80 hover:text-red-300 transition-colors"
            role="menuitem"
          >
            <LogOut size={16} className="shrink-0" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  ) : null;

const NavLinks = ({ 
  pathname, 
  badges,
  onNavigate 
}: { 
  pathname: string, 
  badges: Record<NavBadgeKey, number>,
  onNavigate?: () => void 
}) => {
  return (
    <nav className="flex flex-col px-3 pb-6" aria-label="Main navigation">
      {navGroups.map((group, groupIdx) => (
        <div key={group.title} className={groupIdx > 0 ? "mt-6" : ""}>
          <h3 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {group.title}
          </h3>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              const IconComponent = item.icon;
              const badgeValue = item.badgeKey ? badges[item.badgeKey] : 0;
              const hasBadge = badgeValue > 0;
              const displayBadge = badgeValue > 99 ? "99+" : String(badgeValue);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  onClick={onNavigate}
                  className={`
                    flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-primary-600/90 text-white shadow-md shadow-primary-900/25"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComponent size={20} className="shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </div>
                  
                  {hasBadge && (
                    <span
                      className={`
                        shrink-0 min-w-[1.5rem] h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold tabular-nums
                        ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-amber-500 text-slate-950"
                        }
                      `}
                      aria-label={`${badgeValue} items`}
                    >
                      {displayBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};

const SidebarChrome = ({
  user,
  userMenuOpen,
  setUserMenuOpen,
  handleSignOut,
  pathname,
  badges,
  onNavigate,
  showClose = false,
}: {
  user: any;
  userMenuOpen: boolean;
  setUserMenuOpen: (o: boolean) => void;
  handleSignOut: () => void;
  pathname: string;
  badges: Record<NavBadgeKey, number>;
  onNavigate?: () => void;
  showClose?: boolean;
}) => (
  <>
    <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-800/70 px-4">
      <BrandBlock onNavigate={onNavigate} />
      {showClose && (
        <button
          type="button"
          onClick={() => onNavigate?.()}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
          aria-label="Close menu"
        >
          <X size={22} />
        </button>
      )}
    </div>
    <div className="flex-1 overflow-y-auto pt-5 pb-4 custom-scrollbar">
      <NavLinks 
        pathname={pathname}
        badges={badges}
        onNavigate={onNavigate}
      />
    </div>
    {user && (
      <div className="shrink-0 border-t border-slate-800/70 p-3">
        <UserMenu 
          user={user}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          handleSignOut={handleSignOut}
          alignUp 
        />
      </div>
    )}
  </>
);

export default function Navigation({ children }: NavigationProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingFootageCount, setPendingFootageCount] = useState(0);
  const [intakeCount, setIntakeCount] = useState(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-user-menu]") &&
        !target.closest("[data-user-trigger]")
      ) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Subscribe to Footage Requests Badge
  useEffect(() => {
    if (!user) {
      setPendingFootageCount(0);
      return;
    }
    const unsub = subscribeToFootageRequests((requests) => {
      setPendingFootageCount(
        requests.filter((r) => r.status === "pending").length,
      );
    });
    return () => {
      unsub();
      setPendingFootageCount(0);
    };
  }, [user]);

  // Subscribe to Emergency Reports (Intake Awaiting Triage Badge)
  useEffect(() => {
    if (!user) {
      setIntakeCount(0);
      return;
    }
    const unsub = subscribeToEmergencyReports((reports) => {
      // Calculate unassigned/pending emergencies needing triage
      const awaitingTriage = reports.filter(
        (r) => r.status !== 'done' && r.status !== 'resolved' && !r.viewedByName
      ).length;
      setIntakeCount(awaitingTriage);
    }, { limitCount: 200 }); // get a healthy pool to accurately calculate metrics
    return () => {
      unsub();
      setIntakeCount(0);
    };
  }, [user]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    await signOut();
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const badges: Record<NavBadgeKey, number> = {
    intakeCount,
    pendingFootageCount
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Desktop: fixed to viewport so it never stretches with page content */}
      <aside
        className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 z-40 w-64 xl:w-72 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl min-h-0"
        aria-label="Command navigation"
      >
        <SidebarChrome 
          user={user}
          userMenuOpen={userMenuOpen}
          setUserMenuOpen={setUserMenuOpen}
          handleSignOut={handleSignOut}
          pathname={pathname}
          badges={badges}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(288px,88vw)] flex-col border-r border-slate-800/80 bg-slate-950 shadow-2xl shadow-black/40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <SidebarChrome
              user={user}
              userMenuOpen={userMenuOpen}
              setUserMenuOpen={setUserMenuOpen}
              handleSignOut={handleSignOut}
              pathname={pathname}
              badges={badges}
              onNavigate={() => setMobileMenuOpen(false)}
              showClose
            />
          </aside>
        </>
      )}

      <div className="flex h-screen min-w-0 flex-col lg:pl-64 xl:pl-72 focus:outline-none">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-950/95 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <BrandBlock compact onNavigate={() => setMobileMenuOpen(false)} />
          <div className="flex w-10 justify-end">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-red-300 transition-colors"
                aria-label="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0">{children}</div>
      </div>
      <OperationalChatWidget />
      <AgentAssistant />
    </div>
  );
}
