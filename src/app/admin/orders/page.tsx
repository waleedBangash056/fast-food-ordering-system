"use client";

import React, { useState, useEffect } from "react";
import { formatMinorUnits } from "@/lib/utils";
import Link from "next/link";
import { ExternalLink, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminOrderRow {
  id: string;
  orderNumber: string;
  trackingToken: string;
  guestName: string;
  guestEmail: string;
  serviceMode: string;
  status: string;
  totalMinor: number;
  createdAt: string;
  items: Array<{ itemNameSnapshot: string; quantity: number }>;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/v1/orders");
      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message || json.message || "Failed to load orders");
      }
      setOrders(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.guestName.toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-display">
            Order Master Register
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Authoritative transactional record of all customer orders, states, and payments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order #, customer, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[var(--accent-orange)] w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[var(--accent-orange)]" : ""}`} />
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={fetchOrders}
            className="text-white underline hover:no-underline font-semibold ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#161A22]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-neutral-400 font-bold uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Fulfillment</th>
                <th className="p-4">Items</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total</th>
                <th className="p-4">Created</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-400">
                    <RefreshCw className="h-5 w-5 animate-spin text-[var(--accent-orange)] mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-neutral-400">
                    No orders found matching your query.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-white">{o.orderNumber}</td>
                    <td className="p-4">
                      <p className="font-semibold text-white">{o.guestName}</p>
                      <p className="text-[11px] text-neutral-400">{o.guestEmail}</p>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase">
                        {o.serviceMode}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-neutral-300">
                      {o.items.map((i) => `${i.quantity}x ${i.itemNameSnapshot}`).join(", ")}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 font-bold tabular-nums text-white">
                      {formatMinorUnits(o.totalMinor)}
                    </td>
                    <td className="p-4 text-neutral-400">
                      {new Date(o.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/orders/${o.id}/track?token=${o.trackingToken}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[var(--accent-orange)] hover:underline font-semibold"
                      >
                        <span>Track</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
