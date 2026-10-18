"use client";

import React, { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Flame,
  Bike,
  PackageCheck,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  MapPin,
} from "lucide-react";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface OrderTrackingData {
  id: string;
  orderNumber: string;
  guestName: string;
  serviceMode: "DELIVERY" | "PICKUP";
  status: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  createdAt: string;
  updatedAt: string;
  deliveryAddress?: {
    streetAddress: string;
    city: string;
    postalCode: string;
  };
  items: Array<{
    id: string;
    itemNameSnapshot: string;
    quantity: number;
    lineTotalMinor: number;
  }>;
  statusHistory: Array<{
    newStatus: string;
    changedAt: string;
    note?: string;
  }>;
}

const DELIVERY_STEPS = [
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing in Kitchen", icon: Flame },
  { key: "OUT_FOR_DELIVERY", label: "On The Way", icon: Bike },
  { key: "DELIVERED", label: "Delivered", icon: PackageCheck },
];

const PICKUP_STEPS = [
  { key: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Preparing in Kitchen", icon: Flame },
  { key: "READY", label: "Ready for Pickup", icon: PackageCheck },
  { key: "DELIVERED", label: "Picked Up", icon: CheckCircle2 },
];

export default function OrderTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [order, setOrder] = useState<OrderTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial order data and setup SSE with polling fallback
  useEffect(() => {
    let sseSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const fetchOrder = async () => {
      try {
        const url = `/api/v1/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok || json.error) {
          throw new Error(json.error?.message || "Order not found or unauthorized.");
        }

        setOrder(json.data);
        setError(null);
      } catch (err: any) {
        setOrder((current) => {
          if (!current) {
            setError(err.message || "Unable to load order details.");
          }
          return current;
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Setup Server-Sent Events (SSE) stream
    if (typeof EventSource !== "undefined") {
      const sseUrl = `/api/v1/orders/${id}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`;
      sseSource = new EventSource(sseUrl);

      sseSource.onopen = () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      };

      sseSource.addEventListener("order.status", (event) => {
        try {
          const payload = JSON.parse(event.data);
          setOrder((prev) => {
            if (!prev) {
              fetchOrder();
              return null;
            }
            return {
              ...prev,
              status: payload.status,
              statusHistory: payload.statusHistory || prev.statusHistory,
              updatedAt: payload.updatedAt || prev.updatedAt,
            };
          });
          setError(null);
        } catch {
          // ignore parse errors
        }
      });

      sseSource.onerror = () => {
        // SSE disconnected, fallback to 10-second polling
        if (!pollInterval) {
          pollInterval = setInterval(fetchOrder, 10000);
        }
      };
    } else {
      pollInterval = setInterval(fetchOrder, 10000);
    }

    return () => {
      sseSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id, token]);

  const getStepProgressIndex = (status: string, mode: "DELIVERY" | "PICKUP") => {
    switch (status) {
      case "PENDING_PAYMENT":
      case "PAID":
      case "CONFIRMED":
        return 0;
      case "ACCEPTED":
      case "PREPARING":
        return 1;
      case "READY":
        return 2;
      case "OUT_FOR_DELIVERY":
        return 2;
      case "DELIVERED":
        return 3;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-[var(--accent-red)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-[var(--cream-muted)]">Connecting to live kitchen feed...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-[var(--error)] mx-auto" />
        <h2 className="text-xl font-bold text-[var(--cream)]">Order Not Available</h2>
        <p className="text-sm text-[var(--cream-muted)]">{error || "Please verify your tracking link."}</p>
        <Link href="/menu" className="inline-block pt-2">
          <Button variant="primary">Return to Menu</Button>
        </Link>
      </div>
    );
  }

  const currentStep = getStepProgressIndex(order.status, order.serviceMode);
  const steps = order.serviceMode === "PICKUP" ? PICKUP_STEPS : DELIVERY_STEPS;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-glass)] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--success)]/20 text-[var(--success)] text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            <span>Live Kitchen Connection Active</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
            Order {order.orderNumber}
          </h1>
          <p className="text-xs text-[var(--cream-muted)] mt-1">
            Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} •{" "}
            {order.serviceMode === "PICKUP" ? "Estimated Pickup in 15-20 mins" : "Estimated Delivery in 25-35 mins"}
          </p>
        </div>

        <Link href="/menu">
          <Button variant="outline" size="sm">
            Order More Food
          </Button>
        </Link>
      </div>

      {/* Visual Live Status Stepper */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-orange)]">
          Real-Time Progress
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {steps.map((step, idx) => {
            const isCompleted = idx <= currentStep;
            const isCurrent = idx === currentStep;
            const Icon = step.icon;

            return (
              <div
                key={step.key}
                className={`p-4 rounded-2xl border transition-all text-center flex flex-col items-center gap-2 ${
                  isCurrent
                    ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-white shadow-lg"
                    : isCompleted
                    ? "bg-[var(--surface-dark)] border-white/20 text-[var(--cream)]"
                    : "bg-[var(--surface-dark)]/40 border-[var(--border-glass)] text-neutral-500 opacity-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? "bg-[var(--accent-red)] text-white animate-bounce"
                      : isCompleted
                      ? "bg-white/10 text-[var(--success)]"
                      : "bg-white/5 text-neutral-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold leading-tight">{step.label}</span>
                {isCurrent && (
                  <span className="text-[10px] font-semibold text-[var(--accent-orange)] uppercase tracking-wider">
                    In Progress
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Details & Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Items Summary */}
        <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--cream)]">
            Items in This Order
          </h3>
          <div className="space-y-3 divide-y divide-[var(--border-glass)]">
            {order.items.map((item) => (
              <div key={item.id} className="pt-2 flex justify-between text-xs">
                <span className="font-semibold text-[var(--cream)]">
                  {item.quantity}× {item.itemNameSnapshot}
                </span>
                <span className="tabular-nums font-bold text-[var(--cream)]">
                  {formatMinorUnits(item.lineTotalMinor)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--border-glass)] space-y-1.5 text-xs text-[var(--cream-muted)]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums font-semibold text-[var(--cream)]">
                {formatMinorUnits(order.subtotalMinor)}
              </span>
            </div>
            {order.discountMinor > 0 && (
              <div className="flex justify-between text-[var(--accent-red)]">
                <span>Discount</span>
                <span className="tabular-nums">-{formatMinorUnits(order.discountMinor)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery</span>
              <span className="tabular-nums font-semibold text-[var(--cream)]">
                {order.deliveryFeeMinor === 0 ? "FREE" : formatMinorUnits(order.deliveryFeeMinor)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[var(--cream)] pt-2 border-t border-[var(--border-glass)]">
              <span>Total Paid</span>
              <span className="tabular-nums text-base">
                {formatMinorUnits(order.totalMinor)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Delivery Destination & History */}
        <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--cream)]">
            Fulfillment Details
          </h3>

          <div className="p-4 rounded-2xl bg-[var(--surface-dark)] border border-[var(--border-glass)] text-xs space-y-2">
            <div className="flex items-center gap-2 text-[var(--accent-orange)] font-bold uppercase tracking-wider">
              <MapPin className="h-4 w-4" />
              <span>{order.serviceMode === "DELIVERY" ? "Delivery Destination" : "Pickup Location"}</span>
            </div>
            {order.deliveryAddress ? (
              <div className="text-[var(--cream)] leading-relaxed">
                <p className="font-semibold">{order.guestName}</p>
                <p>{order.deliveryAddress.streetAddress}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.postalCode}</p>
              </div>
            ) : (
              <p className="text-[var(--cream)]">
                Pickup counter at Downtown Flagship (742 Evergreen Blvd).
              </p>
            )}
          </div>

          {/* Status Timeline History */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">
              Event History
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-[var(--cream-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-orange)] mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-white font-medium">{h.newStatus}</p>
                    {h.note && <p className="text-[11px] text-neutral-400">{h.note}</p>}
                  </div>
                  <span className="text-[10px] tabular-nums text-neutral-500">
                    {new Date(h.changedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
