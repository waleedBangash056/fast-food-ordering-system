"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/features/cart/cart-context";
import { calculateItemLineTotalMinor } from "@/lib/pricing/calculator";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  CreditCard,
  Truck,
  Store,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    itemCount,
    serviceMode,
    setServiceMode,
    branchId,
    setBranchId,
    totals,
    appliedCoupon,
    clearCart,
  } = useCart();

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("San Francisco");
  const [postalCode, setPostalCode] = useState("94105");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "CASH">("CARD");

  // Status & Error
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stable idempotency key per cart fingerprint across retry attempts
  const idempotencyStateRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const cartFingerprint = JSON.stringify({
    branchId,
    serviceMode,
    paymentMethod,
    customer: {
      fullName,
      email,
      phone,
    },
    deliveryAddress:
      serviceMode === "DELIVERY"
        ? {
            streetAddress,
            unit: unit || null,
            city,
            postalCode,
            deliveryInstructions: deliveryInstructions || null,
          }
        : null,
    couponCode: appliedCoupon?.code ?? null,
    totalMinor: totals.totalMinor,
    items: items.map((i) => ({
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      modifiers: Object.values(i.selectedModifiers)
        .flat()
        .map((m) => m.id)
        .sort(),
    })),
  });

  // If cart is empty, redirect back to menu
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/menu");
    }
  }, [items, router]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName || !email || !phone) {
      setErrorMessage("Please fill in your contact information.");
      return;
    }

    if (serviceMode === "DELIVERY" && (!streetAddress || !postalCode)) {
      setErrorMessage("Please provide a complete delivery street address and postal code.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Reuse stable client idempotency key for identical cart payload across retries
      if (
        !idempotencyStateRef.current ||
        idempotencyStateRef.current.fingerprint !== cartFingerprint
      ) {
        idempotencyStateRef.current = {
          fingerprint: cartFingerprint,
          key: `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        };
      }
      const idempotencyKey = idempotencyStateRef.current.key;

      // 2. Submit order to /api/v1/orders
      const orderPayload = {
        serviceMode,
        branchId,
        customer: {
          fullName,
          email,
          phone,
        },
        deliveryAddress:
          serviceMode === "DELIVERY"
            ? {
                streetAddress,
                unit: unit || undefined,
                city,
                postalCode,
                deliveryInstructions: deliveryInstructions || undefined,
              }
            : undefined,
        items,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        notes: deliveryInstructions,
      };

      const orderRes = await fetch("/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || orderJson.error) {
        throw new Error(orderJson.error?.message || "Failed to create order.");
      }

      const orderData = orderJson.data;

      // 3. Payment handling:
      // - CARD: Initialize online payment intent with STRIPE
      // - CASH: Bypasses intent creation and sandbox capture; order is created directly with an unpaid cash payment record
      if (paymentMethod === "CARD") {
        try {
          const isSandboxEnv = process.env.NODE_ENV !== "production";
          const intentRes = await fetch("/api/v1/payments/intents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: orderData.id,
              provider: "STRIPE",
              trackingToken: orderData.trackingToken,
              simulateCaptureInSandbox: isSandboxEnv,
            }),
          });

          const intentJson = await intentRes.json().catch(() => null);
          if (!intentRes.ok || intentJson?.error) {
            throw new Error(intentJson?.error?.message || "Failed to initialize payment gateway.");
          }
        } catch (paymentErr) {
          console.warn("Payment intent initialization pending:", paymentErr);
          idempotencyStateRef.current = null;
          clearCart();
          router.push(`/orders/${orderData.id}/track?token=${orderData.trackingToken}`);
          return;
        }
      }

      // 4. Clear cart and navigate to live tracking
      idempotencyStateRef.current = null;
      clearCart();
      router.push(`/orders/${orderData.id}/track?token=${orderData.trackingToken}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during checkout.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cream-muted)] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Cart</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] mt-2 font-display">
          Checkout & Confirmation
        </h1>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[var(--error)]/15 border border-[var(--error)]/40 flex items-center gap-3 text-sm text-red-200">
          <AlertCircle className="h-5 w-5 text-[var(--error)] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Customer, Fulfillment, Payment */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Customer Info */}
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-orange)]">
              1. Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="Jordan Lee"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="(555) 000-0000"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Email Address (for order receipts & tracking)"
                  type="email"
                  placeholder="jordan@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Fulfillment Details */}
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-orange)]">
                2. Fulfillment Method & Location
              </h2>
              <div className="inline-flex rounded-full bg-[var(--surface-dark)] p-0.5 border border-[var(--border-glass)]">
                <button
                  type="button"
                  onClick={() => setServiceMode("DELIVERY")}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    serviceMode === "DELIVERY"
                      ? "bg-[var(--accent-red)] text-white shadow-sm"
                      : "text-[var(--cream-muted)] hover:text-white"
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setServiceMode("PICKUP")}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    serviceMode === "PICKUP"
                      ? "bg-[var(--accent-red)] text-white shadow-sm"
                      : "text-[var(--cream-muted)] hover:text-white"
                  }`}
                >
                  Pickup
                </button>
              </div>
            </div>

            {/* Branch Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">
                Preparing Kitchen Branch
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl bg-[var(--surface-dark)] px-4 py-3 text-sm text-[var(--cream)] border border-[var(--border-glass)] focus:outline-none focus:border-[var(--accent-orange)]"
              >
                <option value="branch-1">Downtown Flagship — 742 Evergreen Blvd</option>
                <option value="branch-2">Westside Express — 1280 Ocean Parkway</option>
                <option value="branch-3">Uptown Plaza — 450 Heights Ave</option>
              </select>
            </div>

            {/* Address fields for Delivery */}
            {serviceMode === "DELIVERY" ? (
              <div className="space-y-4 pt-2 border-t border-[var(--border-glass)]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Street Address"
                      placeholder="123 Main Street"
                      required
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Apt / Suite / Unit"
                      placeholder="Apt 4B"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="City"
                      placeholder="San Francisco"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Postal Code"
                      placeholder="94105"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                </div>

                <Input
                  label="Delivery Instructions"
                  placeholder="e.g. Leave at door, gate code #1234"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-[var(--cream-muted)] flex items-center gap-3">
                <Store className="h-5 w-5 text-[var(--accent-orange)] shrink-0" />
                <span>
                  Your order will be prepared fresh and ready at the express pickup counter in approximately 15-20 minutes.
                </span>
              </div>
            )}
          </div>

          {/* Step 3: Payment Method */}
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--accent-orange)]">
              3. Payment Selection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  paymentMethod === "CARD"
                    ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-white"
                    : "bg-[var(--surface-dark)] border-[var(--border-glass)] text-[var(--cream-muted)] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-[var(--accent-red)]" />
                  <div>
                    <p className="text-sm font-bold text-white">Credit / Debit Card</p>
                    <p className="text-xs text-[var(--cream-muted)]">Encrypted & PCI Compliant</p>
                  </div>
                </div>
                {paymentMethod === "CARD" && <CheckCircle2 className="h-5 w-5 text-[var(--accent-red)]" />}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`p-4 rounded-2xl border flex items-center justify-between text-left transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-white"
                    : "bg-[var(--surface-dark)] border-[var(--border-glass)] text-[var(--cream-muted)] hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-[var(--accent-orange)]" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {serviceMode === "DELIVERY" ? "Cash on Delivery" : "Pay at Counter"}
                    </p>
                    <p className="text-xs text-[var(--cream-muted)]">Pay when received</p>
                  </div>
                </div>
                {paymentMethod === "CASH" && <CheckCircle2 className="h-5 w-5 text-[var(--accent-red)]" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--cream)]">
              Order Review ({itemCount} {itemCount === 1 ? "item" : "items"})
            </h3>

            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-[var(--border-glass)]">
              {items.map((item) => (
                <div key={item.cartItemId} className="pt-2 flex justify-between text-xs">
                  <div>
                    <span className="font-bold text-[var(--cream)]">
                      {item.quantity}× {item.name}
                    </span>
                    {Object.entries(item.selectedModifiers).length > 0 && (
                      <p className="text-[10px] text-[var(--cream-muted)]">
                        {Object.values(item.selectedModifiers)
                          .flat()
                          .map((o) => o.name)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums text-[var(--cream)]">
                    {formatMinorUnits(calculateItemLineTotalMinor(item))}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-glass)] space-y-2 text-xs text-[var(--cream-muted)]">
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
                <span>Delivery Fee</span>
                <span className="tabular-nums font-semibold text-[var(--cream)]">
                  {totals.deliveryFeeMinor === 0 ? "FREE" : formatMinorUnits(totals.deliveryFeeMinor)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="tabular-nums font-semibold text-[var(--cream)]">
                  {formatMinorUnits(totals.taxMinor)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[var(--cream)] pt-2 border-t border-[var(--border-glass)]">
                <span>Total Due</span>
                <span className="tabular-nums text-xl text-[var(--cream)]">
                  {formatMinorUnits(totals.totalMinor)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full font-bold shadow-xl mt-4"
            >
              {isSubmitting ? "Placing Order..." : `Place Order • ${formatMinorUnits(totals.totalMinor)}`}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 pt-2">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              <span>Idempotent Submission & 256-bit Encryption</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
