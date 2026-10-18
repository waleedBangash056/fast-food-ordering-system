"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SEED_COUPONS } from "@/lib/db/seed-data";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tag, Sparkles, Check, Copy, ArrowRight } from "lucide-react";

export default function OffersPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel text-xs font-bold uppercase tracking-wider text-[var(--accent-red)]">
          <Sparkles className="h-4 w-4" />
          <span>Exclusive Specials</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Current Promotions & Deals
        </h1>
        <p className="text-xs sm:text-sm text-[var(--cream-muted)]">
          Apply any of these verified promo codes directly during checkout or cart review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SEED_COUPONS.map((coupon) => (
          <div
            key={coupon.code}
            className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-[var(--accent-red)]/20 text-[var(--accent-red)]">
                  <Tag className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white">
                  {coupon.discountType === "PERCENTAGE"
                    ? `${coupon.discountValue / 100}% Off`
                    : `${formatMinorUnits(coupon.discountValue)} Off`}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  {coupon.description}
                </h3>
                <p className="text-xs text-[var(--cream-muted)] mt-1">
                  Requires minimum subtotal of {formatMinorUnits(coupon.minSubtotalMinor)}.
                  {coupon.maxDiscountMinor ? ` Capped at ${formatMinorUnits(coupon.maxDiscountMinor)}.` : ""}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--border-glass)]">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-dark)] border border-[var(--border-glass)]">
                <span className="font-mono text-sm font-extrabold tracking-wider text-[var(--accent-orange)] uppercase">
                  {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(coupon.code)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus-ring"
                  aria-label={`Copy coupon code ${coupon.code}`}
                >
                  {copiedCode === coupon.code ? (
                    <Check className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <Link href="/menu" className="block w-full">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-1.5">
                  <span>Order & Apply</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
