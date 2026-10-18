import React from "react";
import { notFound } from "next/navigation";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { ProductCard } from "@/components/commerce/product-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = await catalogService.getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const items = await catalogService.getMenuItems({ categorySlug: slug });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--cream-muted)] hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Categories</span>
      </Link>

      <div className="space-y-2 border-b border-[var(--border-glass)] pb-6">
        <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          {category.name}
        </h1>
        <p className="text-sm text-[var(--cream-muted)] max-w-2xl">
          {category.description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item, idx) => (
          <ScrollReveal key={item.id} animation="fade-up" delayMs={(idx % 4) * 80}>
            <ProductCard item={item} />
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
