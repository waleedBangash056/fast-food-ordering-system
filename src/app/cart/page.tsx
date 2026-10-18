"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Minus, Trash2, ArrowRight, ShoppingBag, ShieldCheck, Tag } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const {
    items,
    itemCount,
    updateQuantity,
    removeItem,
    serviceMode,
    setServiceMode,
    totals,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = couponInput.trim();
    if (!trimmed || isApplying) return;
    setCouponError(null);
    setIsApplying(true);
    try {
      const res = await applyCoupon(trimmed);
      if (!res.success) {
        setCouponError(res.message);
      } else {
        setCouponInput("");
      }
    } catch {
      setCouponError("Failed to apply promo code. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-[var(--cream-muted)] max-w-md mx-auto">
          Explore our craft smashed burgers, Nashville hot chicken, and artisanal custard shakes.
        </p>
        <Link href="/menu" className="inline-block">
          <Button variant="primary" size="lg">
            Browse Menu
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[var(--border-glass)] pb-4 flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Order Review
        </h1>
        <span className="text-sm text-[var(--cream-muted)] font-semibold">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const modifierTotal = Object.values(item.selectedModifiers).reduce(
              (sum, group) => sum + group.reduce((gSum, opt) => gSum + opt.priceDeltaMinor, 0),
              0
            );
            const lineTotal = (item.basePriceMinor + modifierTotal) * item.quantity;

            return (
              <div
                key={item.cartItemId}
                className="p-5 rounded-3xl bg-[var(--surface-card)] border border-[var(--border-glass)] flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
              >
                <div className="flex gap-4 items-center">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--cream)]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[var(--cream-muted)] mt-0.5">
                      Base: {formatMinorUnits(item.basePriceMinor)} each
                    </p>
                    {Object.entries(item.selectedModifiers).length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(item.selectedModifiers).map(([gName, opts]) =>
                          opts.map((opt) => (
                            <span
                              key={opt.id}
                              className="inline-block text-[11px] text-[var(--cream-muted)] bg-white/5 px-2 py-0.5 rounded-md mr-1 mt-0.5"
                            >
                              + {opt.name}{" "}
                              {opt.priceDeltaMinor > 0 && `(${formatMinorUnits(opt.priceDeltaMinor)})`}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  <div className="inline-flex items-center border border-[var(--border-glass)] rounded-full p-1 bg-[var(--surface-dark)]">
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-lg font-bold tabular-nums text-[var(--cream)] min-w-[70px] text-right">
                    {formatMinorUnits(lineTotal)}
                  </span>

                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    aria-label={`Remove ${item.name}`}
                    className="p-2 text-neutral-400 hover:text-[var(--error)] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Totals & Mode */}
        <div className="lg:col-span-4 space-y-6">
          {/* Service Mode Selector Card */}
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">
              Fulfillment Method
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setServiceMode("DELIVERY")}
                className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                  serviceMode === "DELIVERY"
                    ? "bg-[var(--accent-red)] border-[var(--accent-red)] text-white shadow-lg shadow-red-950/40"
                    : "bg-[var(--surface-dark)] border-[var(--border-glass)] text-[var(--cream-muted)] hover:text-white"
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setServiceMode("PICKUP")}
                className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                  serviceMode === "PICKUP"
                    ? "bg-[var(--accent-red)] border-[var(--accent-red)] text-white shadow-lg shadow-red-950/40"
                    : "bg-[var(--surface-dark)] border-[var(--border-glass)] text-[var(--cream-muted)] hover:text-white"
                }`}
              >
                Pickup
              </button>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">
              Summary
            </h3>

            {/* Promo Code Section */}
            <div className="pt-1 pb-3 border-b border-[var(--border-glass)]">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30">
                  <div className="flex items-center gap-2.5">
                    <Tag className="h-4 w-4 text-[var(--accent-red)] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-[var(--accent-red)] uppercase tracking-wider">
                        {appliedCoupon.code} Applied
                      </p>
                      <p className="text-[11px] text-[var(--cream-muted)]">
                        {appliedCoupon.description} (-{formatMinorUnits(appliedCoupon.discountMinor)})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-xs font-semibold text-neutral-400 hover:text-white underline focus-ring px-2 py-1"
                    aria-label="Remove applied coupon"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Promo code (e.g. WELCOME10)"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        if (couponError) setCouponError(null);
                      }}
                      disabled={isApplying}
                      className="flex-1 rounded-2xl bg-[var(--surface-dark)] px-3.5 py-2.5 text-xs text-[var(--cream)] placeholder:text-neutral-500 border border-[var(--border-glass)] uppercase tracking-wider focus:outline-none focus:border-[var(--accent-orange)] disabled:opacity-50"
                      aria-label="Promo code input"
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isApplying}
                      disabled={!couponInput.trim() || isApplying}
                      className="rounded-2xl px-4 text-xs font-bold"
                    >
                      Apply
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-[var(--accent-red)] font-medium pl-1" role="alert">
                      {couponError}
                    </p>
                  )}
                </form>
              )}
            </div>

            <div className="space-y-2 text-sm text-[var(--cream-muted)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums font-semibold text-[var(--cream)]">
                  {formatMinorUnits(totals.subtotalMinor)}
                </span>
              </div>
              {totals.discountMinor > 0 && (
                <div className="flex justify-between text-[var(--accent-red)] font-semibold">
                  <span>Promo Discount ({appliedCoupon?.code})</span>
                  <span className="tabular-nums">-{formatMinorUnits(totals.discountMinor)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Fee ({serviceMode})</span>
                <span className="tabular-nums font-semibold text-[var(--cream)]">
                  {totals.deliveryFeeMinor === 0 ? "FREE" : formatMinorUnits(totals.deliveryFeeMinor)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (8.25%)</span>
                <span className="tabular-nums font-semibold text-[var(--cream)]">
                  {formatMinorUnits(totals.taxMinor)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[var(--cream)] pt-3 border-t border-[var(--border-glass)]">
                <span>Estimated Total</span>
                <span className="tabular-nums text-xl text-[var(--cream)]">
                  {formatMinorUnits(totals.totalMinor)}
                </span>
              </div>
            </div>

            <Link href="/checkout" className="block w-full pt-2">
              <Button variant="primary" size="lg" className="w-full gap-2 font-bold shadow-xl">
                <span>Proceed to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
