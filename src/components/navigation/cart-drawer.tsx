"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, Tag, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const {
    items,
    itemCount,
    isCartDrawerOpen,
    closeCartDrawer,
    updateQuantity,
    removeItem,
    serviceMode,
    totals,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isCartDrawerOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          closeCartDrawer();
          return;
        }

        if (e.key === "Tab" && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first || document.activeElement === drawerRef.current) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      drawerRef.current?.focus();

      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
        previousActiveElement.current?.focus();
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isCartDrawerOpen, closeCartDrawer]);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponError(null);
    setCouponSuccess(null);
    setIsApplying(true);

    const res = await applyCoupon(couponInput.trim());
    setIsApplying(false);

    if (res.success) {
      setCouponSuccess(res.message);
      setCouponInput("");
    } else {
      setCouponError(res.message);
    }
  };

  if (!isCartDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your Shopping Cart"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={closeCartDrawer}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          tabIndex={-1}
          className="w-screen max-w-md bg-[var(--surface-dark)] border-l border-[var(--border-glass-strong)] shadow-2xl flex flex-col text-[var(--cream)] focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-glass)]">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[var(--accent-red)]" />
              <h2 className="text-lg font-bold tracking-tight">Your Order</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-[var(--cream-muted)]">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={closeCartDrawer}
              aria-label="Close cart"
              className="rounded-full p-2 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-neutral-500">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--cream)]">Your cart is empty</h3>
                <p className="text-sm text-[var(--cream-muted)] max-w-xs">
                  Discover our chef-crafted burgers, hand-spun shakes, and loaded sides.
                </p>
                <Button
                  variant="primary"
                  onClick={closeCartDrawer}
                  className="mt-2"
                >
                  Explore Menu
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const modifierTotal = Object.values(item.selectedModifiers).reduce(
                    (sum, group) => sum + group.reduce((gSum, opt) => gSum + opt.priceDeltaMinor, 0),
                    0
                  );
                  const itemUnitPrice = item.basePriceMinor + modifierTotal;
                  const itemLineTotal = itemUnitPrice * item.quantity;

                  return (
                    <div
                      key={item.cartItemId}
                      className="p-3.5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-glass)] flex gap-3 items-start"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-[var(--cream)] leading-snug truncate">
                            {item.name}
                          </h4>
                          <span className="text-sm font-bold tabular-nums text-[var(--cream)]">
                            {formatMinorUnits(itemLineTotal)}
                          </span>
                        </div>

                        {/* Modifiers List */}
                        {Object.entries(item.selectedModifiers).length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(item.selectedModifiers).map(([groupName, options]) =>
                              options.map((opt) => (
                                <p key={opt.id} className="text-xs text-[var(--cream-muted)] truncate">
                                  + {opt.name}{" "}
                                  {opt.priceDeltaMinor > 0 && `(${formatMinorUnits(opt.priceDeltaMinor)})`}
                                </p>
                              ))
                            )}
                          </div>
                        )}

                        {/* Stepper & Trash */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[var(--border-glass)] rounded-full p-0.5 bg-[var(--surface-dark)]">
                            <button
                              onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="p-1 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors focus-ring"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-7 text-center text-xs font-semibold tabular-nums text-[var(--cream)]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="p-1 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors focus-ring"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.cartItemId)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="p-1.5 text-neutral-500 hover:text-[var(--error)] transition-colors focus-ring rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Coupon Code Section */}
                <div className="pt-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[var(--accent-red)]" />
                        <div>
                          <p className="text-xs font-bold text-[var(--accent-red)] uppercase tracking-wider">
                            {appliedCoupon.code} Applied
                          </p>
                          <p className="text-xs text-[var(--cream-muted)]">
                            {appliedCoupon.description} (-{formatMinorUnits(appliedCoupon.discountMinor)})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-xs text-neutral-400 hover:text-white underline focus-ring"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Promo code (e.g. WELCOME10)"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          className="flex-1 rounded-xl bg-[var(--surface-dark)] px-3 py-2 text-xs text-[var(--cream)] placeholder:text-neutral-500 border border-[var(--border-glass)] uppercase tracking-wider focus:outline-none focus:border-[var(--accent-orange)]"
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          isLoading={isApplying}
                          disabled={!couponInput.trim()}
                        >
                          Apply
                        </Button>
                      </div>
                      {couponError && <p className="text-xs text-[var(--error)]">{couponError}</p>}
                      {couponSuccess && <p className="text-xs text-[var(--success)]">{couponSuccess}</p>}
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer & Totals */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[var(--border-glass)] bg-[var(--surface-card)] space-y-3">
              <div className="space-y-1.5 text-xs text-[var(--cream-muted)]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-semibold text-[var(--cream)]">
                    {formatMinorUnits(totals.subtotalMinor)}
                  </span>
                </div>
                {totals.discountMinor > 0 && (
                  <div className="flex justify-between text-[var(--accent-red)] font-medium">
                    <span>Discount</span>
                    <span className="tabular-nums">-{formatMinorUnits(totals.discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery ({serviceMode})</span>
                  <span className="tabular-nums font-semibold text-[var(--cream)]">
                    {totals.deliveryFeeMinor === 0 ? "FREE" : formatMinorUnits(totals.deliveryFeeMinor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Tax</span>
                  <span className="tabular-nums font-semibold text-[var(--cream)]">
                    {formatMinorUnits(totals.taxMinor)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-[var(--cream)] pt-2 border-t border-[var(--border-glass)]">
                  <span>Total</span>
                  <span className="tabular-nums text-lg text-[var(--cream)]">
                    {formatMinorUnits(totals.totalMinor)}
                  </span>
                </div>
              </div>

              <Link href="/checkout" onClick={closeCartDrawer} className="block w-full">
                <Button variant="primary" size="lg" className="w-full gap-2">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
