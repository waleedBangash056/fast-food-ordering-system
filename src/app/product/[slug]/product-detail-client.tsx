"use client";

import React, { useState } from "react";
import { type SeedMenuItem } from "@/lib/db/seed-data";
import { ProductCustomizerModal } from "@/components/commerce/product-customizer-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function ProductDetailClient({ item }: { item: SeedMenuItem }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="pt-4">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsModalOpen(true)}
          className="w-full font-bold gap-2 shadow-2xl text-base"
        >
          <Plus className="h-5 w-5" />
          <span>Customize & Add to Order</span>
        </Button>
      </div>

      <ProductCustomizerModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
