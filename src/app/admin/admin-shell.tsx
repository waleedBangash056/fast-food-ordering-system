"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Utensils,
  ClipboardList,
  Shield,
  ArrowLeft,
  Lock,
  UserCheck,
  LogOut,
  Flame,
  ChefHat,
  SlidersHorizontal,
  Layers,
  KeyRound,
  AlertCircle,
  Building2,
} from "lucide-react";
import {
  type StaffSession,
  type StaffRole,
  STAFF_ACCOUNTS,
  isRoleAuthorized,
} from "@/lib/auth/session";

interface AdminSessionContextType {
  session: StaffSession | null;
  login: (identifier: string, secret: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: StaffRole) => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextType>({
  session: null,
  login: async () => {},
  logout: async () => {},
  switchRole: async () => {},
});

export const useAdminSession = () => useContext(AdminSessionContext);

export function AdminShell({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: StaffSession | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<StaffSession | null>(initialSession);
  const [loading, setLoading] = useState(!initialSession);
  const [demoModeEnabled, setDemoModeEnabled] = useState(
    process.env.NODE_ENV !== "production"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [identifierInput, setIdentifierInput] = useState("admin@smashsizzle.com");
  const [pinInput, setPinInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync or check existing session on mount if not provided from SSR
  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
      setLoading(false);
      return;
    }
    async function checkSession() {
      try {
        const res = await fetch("/api/v1/auth/session");
        const json = await res.json();
        if (typeof json.demoModeEnabled === "boolean") {
          setDemoModeEnabled(json.demoModeEnabled);
        }
        if (json.authenticated && json.data) {
          setSession(json.data);
        }
      } catch {
        // Fallback or unauthenticated
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, [initialSession]);

  const loginWithCredentials = async (identifier: string, secret: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, secret }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Verification failed");
      }
      setSession(data.data);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/admin-logout", { method: "POST" });
    } finally {
      setSession(null);
      router.refresh();
    }
  };

  const handleRoleQuickSwitch = async (role: StaffRole) => {
    if (!demoModeEnabled) return;
    const account = STAFF_ACCOUNTS.find((a) => a.role === role);
    if (account) {
      await loginWithCredentials(account.email, account.pin);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0C0E] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[var(--accent-orange)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-neutral-400">Verifying operational credentials...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated: render Staff & Executive Operations Verification Gateway
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0A0C0E] text-[var(--cream)] flex flex-col justify-center items-center p-4 sm:p-8">
        <div className="w-full max-w-lg bg-[#12151B] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent-red)] via-[var(--accent-orange)] to-[var(--accent-yellow)]" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 flex items-center justify-center text-[var(--accent-red)] mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white">
              Operations Verification Gateway
            </h1>
            <p className="text-xs text-[var(--cream-muted)] mt-1.5 max-w-sm">
              Restricted management infrastructure. Enter your provisioned staff email and operational password to proceed.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Verified Role Selection (Strictly disabled in production unless ALLOW_DEMO_STAFF_LOGIN=true) */}
          {demoModeEnabled && (
            <div className="space-y-3 mb-8">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                Quick Verified Role Entry (Development & Review Only):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRoleQuickSwitch("ADMIN")}
                  disabled={isSubmitting}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[var(--accent-orange)] transition-colors">
                      Executive Admin
                    </div>
                    <div className="text-[11px] text-neutral-400">Menu & Catalog Manager</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleQuickSwitch("KITCHEN_OPERATOR")}
                  disabled={isSubmitting}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] flex items-center justify-center shrink-0">
                    <ChefHat className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[var(--accent-orange)] transition-colors">
                      Kitchen Operator
                    </div>
                    <div className="text-[11px] text-neutral-400">Kitchen Display Terminal</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleQuickSwitch("BRANCH_MANAGER")}
                  disabled={isSubmitting}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[var(--accent-orange)] transition-colors">
                      Branch Manager
                    </div>
                    <div className="text-[11px] text-neutral-400">Audit & Capacity Lead</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleQuickSwitch("STAFF")}
                  disabled={isSubmitting}
                  className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all group flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[var(--accent-orange)] transition-colors">
                      Front Counter Staff
                    </div>
                    <div className="text-[11px] text-neutral-400">Order Dispatch & Status</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Credential Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (identifierInput.trim() && pinInput.trim()) {
                loginWithCredentials(identifierInput.trim(), pinInput.trim());
              }
            }}
            className="pt-6 border-t border-white/10 space-y-3"
          >
            <label className="text-xs font-bold text-neutral-400 block">
              Staff Email / Identifier:
            </label>
            <input
              type="text"
              value={identifierInput}
              onChange={(e) => setIdentifierInput(e.target.value)}
              placeholder="admin@smashsizzle.com"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
            />
            <label className="text-xs font-bold text-neutral-400 block">
              Operational Password:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter operational password"
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
              />
              <button
                type="submit"
                disabled={isSubmitting || !identifierInput.trim() || !pinInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90 text-black text-xs font-bold tracking-wide uppercase disabled:opacity-50 transition-colors"
              >
                Verify
              </button>
            </div>
          </form>

          {/* Back to public Storefront */}
          <div className="mt-8 pt-4 border-t border-white/5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Public Customer Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Operations Center layout
  const isMenuAuthorized = isRoleAuthorized(session.role, "MENU_WRITE");
  const isKitchenAuthorized = isRoleAuthorized(session.role, "KITCHEN_TERMINAL");
  const isOrdersAuthorized = isRoleAuthorized(session.role, "ORDER_STATUS_UPDATE");
  const isAuditAuthorized = isRoleAuthorized(session.role, "AUDIT_VIEW");

  return (
    <AdminSessionContext.Provider
      value={{
        session,
        login: loginWithCredentials,
        logout: handleLogout,
        switchRole: handleRoleQuickSwitch,
      }}
    >
      <div className="min-h-screen bg-[#0A0C0E] text-[var(--cream)] flex flex-col">
        {/* Top Operations Header */}
        <header className="border-b border-white/10 bg-[#12151B] px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Storefront</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-red)] flex items-center justify-center text-white">
                <Flame className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm tracking-wide uppercase text-white">
                Operations Center
              </span>
            </div>
          </div>

          {/* Operational Navigation Tabs - Filtered strictly by role clearance */}
          <nav className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            {isMenuAuthorized && (
              <Link
                href="/admin/menu"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  pathname === "/admin/menu"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "bg-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Menu Management</span>
              </Link>
            )}

            {isKitchenAuthorized && (
              <Link
                href="/admin/kitchen"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  pathname === "/admin/kitchen"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "bg-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                <span>Kitchen (KDS)</span>
              </Link>
            )}

            {isOrdersAuthorized && (
              <Link
                href="/admin/orders"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  pathname === "/admin/orders"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "bg-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>All Orders</span>
              </Link>
            )}

            {isAuditAuthorized && (
              <Link
                href="/admin/audit"
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  pathname === "/admin/audit"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "bg-white/5 hover:bg-white/10 text-neutral-300"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Audit Ledger</span>
              </Link>
            )}
          </nav>

          {/* Active Verified Role & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono font-bold text-[var(--accent-orange)]">[{session.role}]</span>
              <span className="text-neutral-300 font-medium hidden md:inline">{session.fullName}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 rounded-xl hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors"
              title="Sign Out / Switch Role"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main Admin Region */}
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </AdminSessionContext.Provider>
  );
}
