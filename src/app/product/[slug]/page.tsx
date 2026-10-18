import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { formatMinorUnits } from "@/lib/utils";
import { ArrowLeft, Clock, Flame, ShieldCheck } from "lucide-react";
import { ProductCustomizerModal } from "@/components/commerce/product-customizer-modal";
import { ProductDetailClient } from "./product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await catalogService.getMenuItemBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cream-muted)] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Menu</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Product Media */}
        <div className="lg:col-span-6">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden glass-panel-strong p-2 border border-[var(--border-glass)] shadow-2xl">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900">
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 500px"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Product Info & Interactive Customizer */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs text-[var(--cream-muted)]">
              {item.calories && (
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 font-semibold">
                  {item.calories} kcal
                </span>
              )}
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {item.prepTimeMinutes}m prep
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
              {item.name}
            </h1>

            <p className="text-sm text-[var(--cream-muted)] leading-relaxed">
              {item.description}
            </p>

            <div className="pt-2">
              <span className="text-2xl sm:text-3xl font-black tabular-nums text-white">
                {formatMinorUnits(item.basePriceMinor)}
              </span>
            </div>
          </div>

          {/* Client-side Customizer and Add Button */}
          <ProductDetailClient item={item} />

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-[var(--cream-muted)]">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
              <span>Smash & Sizzle Culinary Quality Guarantee</span>
            </div>
            <p>
              Every patty cooked fresh to order on raging cast-iron flat-tops. Zero microwave heating or holding warming trays.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
