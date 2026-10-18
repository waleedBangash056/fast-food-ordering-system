"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Flame,
  CheckCircle2,
  Clock,
  Bike,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useAdminSession } from "../admin-shell";
import { isRoleAuthorized } from "@/lib/auth/session";

interface KitchenOrder {
  id: string;
  orderNumber: string;
  serviceMode: "DELIVERY" | "PICKUP";
  status: string;
  guestName: string;
  createdAt: string;
  totalMinor: number;
  notes?: string;
  items: Array<{
    id: string;
    itemNameSnapshot: string;
    quantity: number;
    modifiers: Array<{
      groupNameSnapshot: string;
      optionNameSnapshot: string;
    }>;
  }>;
}

export default function KitchenTerminalPage() {
  const { session } = useAdminSession();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);

  const isAuthorized = session ? isRoleAuthorized(session.role, "KITCHEN_TERMINAL") : false;
  const latestFetchId = useRef(0);

  const fetchOrders = async () => {
    const fetchId = ++latestFetchId.current;
    try {
      const res = await fetch("/api/v1/orders");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data && fetchId === latestFetchId.current) {
        setOrders(json.data);
      }
    } catch {
      // ignore
    } finally {
      if (fetchId === latestFetchId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setTransitioningId(orderId);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        alert(errJson?.error?.message || "Failed to update order status: station clearance denied.");
      }
      await fetchOrders();
    } catch (err) {
      console.error("Status transition failed:", err);
    } finally {
      setTransitioningId(null);
    }
  };

  // If role lacks Kitchen Terminal clearance, render high-contrast security barrier
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#12151B] border border-white/10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white">
          Kitchen Terminal Station Clearance Required
        </h2>
        <p className="text-xs text-[var(--cream-muted)] max-w-md mx-auto leading-relaxed">
          Your active session role (<span className="font-mono font-bold text-[var(--accent-orange)]">{session?.role || "GUEST"}</span>) does not have clearance to view or operate the Kitchen Display System (KDS). Only verified <span className="text-white font-bold">Kitchen Operators</span> and <span className="text-white font-bold">Administrators</span> have station authorization.
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

  // Group by kitchen workflow stages
  const confirmedQueue = orders.filter((o) => o.status === "CONFIRMED");
  const preparingQueue = orders.filter((o) => o.status === "ACCEPTED" || o.status === "PREPARING");
  const readyQueue = orders.filter((o) => o.status === "READY");
  const completedQueue = orders.filter((o) => o.status === "OUT_FOR_DELIVERY" || o.status === "DELIVERED");

  return (
    <div className="space-y-6">
      {/* KDS Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-orange)] animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
              Kitchen Display System (KDS)
            </h1>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time multi-station preparation terminal. Orders advance immediately across stations and notify customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold tabular-nums">
            Active: {confirmedQueue.length + preparingQueue.length + readyQueue.length}
          </div>
        </div>
      </div>

      {/* 4-Column Grid: Confirmed, Preparing, Ready, Dispatched */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
        {/* Column 1: Confirmed Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-yellow)]">
              Incoming Confirmed
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]">
              {confirmedQueue.length}
            </span>
          </div>

          <div className="space-y-3">
            {confirmedQueue.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#161A22] border border-white/10 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-black text-white">{order.orderNumber}</span>
                    <p className="text-xs text-neutral-400">{order.guestName}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 uppercase">
                    {order.serviceMode}
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="text-xs">
                      <span className="font-bold text-white">
                        {it.quantity}× {it.itemNameSnapshot}
                      </span>
                      {it.modifiers.length > 0 && (
                        <p className="text-[10px] text-neutral-400">
                          {it.modifiers.map((m) => m.optionNameSnapshot).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="text-[11px] text-[var(--accent-orange)] bg-orange-950/20 p-2 rounded-lg border border-orange-800/30">
                    Note: {order.notes}
                  </p>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs font-bold gap-1.5"
                  isLoading={transitioningId === order.id}
                  onClick={() => handleStatusChange(order.id, "PREPARING")}
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Start Preparing</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)]">
              On Grill / Prep
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]">
              {preparingQueue.length}
            </span>
          </div>

          <div className="space-y-3">
            {preparingQueue.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#161A22] border border-[var(--accent-orange)]/40 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-black text-white">{order.orderNumber}</span>
                    <p className="text-xs text-neutral-400">{order.guestName}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-[var(--accent-orange)] uppercase">
                    Cooking
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-white/5 pt-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="text-xs">
                      <span className="font-bold text-white">
                        {it.quantity}× {it.itemNameSnapshot}
                      </span>
                      {it.modifiers.length > 0 && (
                        <p className="text-[10px] text-neutral-400">
                          {it.modifiers.map((m) => m.optionNameSnapshot).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full text-xs font-bold gap-1.5 bg-[var(--success)] hover:bg-emerald-600"
                  isLoading={transitioningId === order.id}
                  onClick={() => handleStatusChange(order.id, "READY")}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark as Ready</span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Ready for Dispatch */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--success)]">
              Ready for Dispatch
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--success)]/20 text-[var(--success)]">
              {readyQueue.length}
            </span>
          </div>

          <div className="space-y-3">
            {readyQueue.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#161A22] border border-[var(--success)]/40 space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-black text-white">{order.orderNumber}</span>
                    <p className="text-xs text-neutral-400">{order.guestName}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-[var(--success)] uppercase">
                    Ready
                  </span>
                </div>

                <div className="space-y-1 border-t border-white/5 pt-2 text-xs">
                  {order.items.map((it) => (
                    <p key={it.id} className="text-neutral-300">
                      {it.quantity}× {it.itemNameSnapshot}
                    </p>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold gap-1.5"
                  isLoading={transitioningId === order.id}
                  onClick={() =>
                    handleStatusChange(
                      order.id,
                      order.serviceMode === "DELIVERY" ? "OUT_FOR_DELIVERY" : "DELIVERED"
                    )
                  }
                >
                  <Bike className="h-3.5 w-3.5" />
                  <span>
                    {order.serviceMode === "DELIVERY" ? "Dispatch Courier" : "Customer Picked Up"}
                  </span>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: Completed / En Route */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Completed / En Route
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
              {completedQueue.length}
            </span>
          </div>

          <div className="space-y-3">
            {completedQueue.slice(0, 6).map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#12151B] border border-white/5 space-y-2 opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">{order.orderNumber}</span>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  {order.items.length} items • {formatMinorUnits(order.totalMinor)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
