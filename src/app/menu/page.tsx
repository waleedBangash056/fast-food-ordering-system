import React from "react";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { ProductCard } from "@/components/commerce/product-card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const categories = await catalogService.getCategories();
  const allItems = await catalogService.getMenuItems();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Menu Header */}
      <div className="space-y-4 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)]">
          <Flame className="h-4 w-4" />
          <span>Full Culinary Lineup</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Our Handcrafted Menu
        </h1>
        <p className="text-sm text-[var(--cream-muted)]">
          Every patty seared to order, every shake hand-spun. Choose a category below or explore the entire collection.
        </p>

        {/* Category Jump Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {categories.map((c) => (
            <a
              key={c.id}
              href={`#${c.slug}`}
              className="px-4 py-2 rounded-full bg-[var(--surface-dark)] border border-[var(--border-glass)] text-xs font-semibold text-[var(--cream)] hover:border-[var(--accent-orange)] hover:text-[var(--accent-orange)] transition-colors focus-ring"
            >
              {c.name}
            </a>
          ))}
        </div>
      </div>

      {/* Categorized Items */}
      <div className="space-y-16">
        {categories.map((category) => {
          const categoryItems = allItems.filter((i) => i.categoryId === category.id);

          return (
            <section key={category.id} id={category.slug} className="scroll-mt-24 space-y-6">
              <div className="flex items-baseline justify-between border-b border-[var(--border-glass)] pb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--cream)] font-display">
                    {category.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--cream-muted)] mt-1">
                    {category.description}
                  </p>
                </div>
                <span className="text-xs font-semibold text-neutral-400">
                  {categoryItems.length} items
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {categoryItems.map((item, idx) => (
                  <ScrollReveal key={item.id} animation="fade-up" delayMs={(idx % 4) * 80}>
                    <ProductCard item={item} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
