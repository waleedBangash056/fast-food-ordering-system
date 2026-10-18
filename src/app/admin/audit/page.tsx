import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";
import { auditService } from "@/server/domains/audit/audit-service";
import { getStaffSession } from "@/lib/auth/server-guard";
import { isRoleAuthorized } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await getStaffSession();
  const isAuthorized = session ? isRoleAuthorized(session.role, "AUDIT_VIEW") : false;

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#12151B] border border-white/10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">
          Security Audit Ledger Clearance Required
        </h2>
        <p className="text-xs text-[var(--cream-muted)] max-w-md mx-auto leading-relaxed">
          Your active session role (<span className="font-mono font-bold text-[var(--accent-orange)]">{session?.role || "GUEST"}</span>) does not have clearance to view immutable system audit logs. Only verified <span className="text-white font-bold">Branch Managers</span> and <span className="text-white font-bold">Executive Administrators</span> have security ledger clearance.
        </p>
        <div className="pt-4 flex justify-center">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-orange)] text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <span>Go to Permitted Station (Order Register)</span>
          </Link>
        </div>
      </div>
    );
  }

  const auditEvents = await auditService.getAuditEventsAsync();

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
              Immutable System Audit Ledger
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Cryptographically sealed, append-only record of all administrative, financial, and operational mutations.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-neutral-300">
          <Lock className="h-3.5 w-3.5 text-[var(--success)]" />
          <span>Write-Once Read-Many (WORM)</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#161A22]">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-neutral-400 font-bold uppercase tracking-wider border-b border-white/10">
            <tr>
              <th className="p-4">Event ID</th>
              <th className="p-4">Actor Role</th>
              <th className="p-4">Action</th>
              <th className="p-4">Entity</th>
              <th className="p-4">Details</th>
              <th className="p-4">IP Origin</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-neutral-300">
            {auditEvents.map((evt) => (
              <tr key={evt.id} className="hover:bg-white/[0.02]">
                <td className="p-4 font-mono text-[11px] text-neutral-400">{evt.id}</td>
                <td className="p-4">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white font-bold text-[10px]">
                    {evt.actorRole}
                  </span>
                </td>
                <td className="p-4 font-semibold text-[var(--accent-orange)]">{evt.action}</td>
                <td className="p-4 font-mono text-[11px]">{evt.entityType}:{evt.entityId}</td>
                <td className="p-4">{evt.details}</td>
                <td className="p-4 font-mono text-neutral-400">{evt.ipAddress}</td>
                <td className="p-4 text-neutral-400 font-mono text-[11px]">{evt.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
