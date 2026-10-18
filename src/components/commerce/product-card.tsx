"use client";

import React, { useState } from "react";
import Image from "next/image";
import { type SeedMenuItem } from "@/lib/db/seed-data";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCustomizerModal } from "./product-customizer-modal";
import { Flame, Clock, Plus } from "lucide-react";

interface ProductCardProps {
  item: SeedMenuItem;
}

export function ProductCard({ item }: ProductCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <article className="group relative flex flex-col justify-between rounded-3xl bg-[var(--surface-card)] border border-[var(--border-glass)] overflow-hidden hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-black/60">
        {/* Top Media Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-900">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover motion-safe:group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-card)] via-transparent to-transparent opacity-80" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {item.isFeatured && (
              <Badge variant="featured" className="backdrop-blur-md">
                <Flame className="h-3 w-3 inline mr-1 text-[var(--accent-red)]" />
                Featured
              </Badge>
            )}
          </div>

          {/* Calorie & Prep info */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-[var(--cream-muted)]">
            {item.calories ? (
              <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                {item.calories} kcal
              </span>
            ) : <span />}
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
              <Clock className="h-3 w-3" />
              {item.prepTimeMinutes}m prep
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 flex-col p-5 sm:p-6 justify-between space-y-4">
          <div className="space-y-2">
            <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[var(--cream)] group-hover:text-[var(--accent-orange)] transition-colors leading-snug">
              {item.name}
            </h3>
            <p className="text-xs text-[var(--cream-muted)] line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* Price & Add Action */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-glass)]">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                Price
              </span>
              <span className="text-lg sm:text-xl font-black tabular-nums text-[var(--cream)]">
                {formatMinorUnits(item.basePriceMinor)}
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 font-semibold text-xs rounded-full shadow-md"
              aria-label={`Customize and add ${item.name} to order`}
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </Button>
          </div>
        </div>
      </article>

      <ProductCustomizerModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
