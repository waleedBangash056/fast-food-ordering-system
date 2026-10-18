import React from "react";
import Image from "next/image";
import Link from "next/link";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { ProductCard } from "@/components/commerce/product-card";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Flame, Clock, Award, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await catalogService.getCategories();
  const featuredItems = await catalogService.getMenuItems({ featuredOnly: true });
  const allItems = await catalogService.getMenuItems();

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Cinematic Hero Section */}
      <section className="relative min-h-[82vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden pt-8">
        {/* Background Atmospheric Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[var(--accent-red)]/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Text Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel-strong border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-xs font-bold uppercase tracking-widest">
              <Sparkles className="h-4 w-4 text-[var(--accent-orange)]" />
              <span>Next-Gen Fast-Food Experience</span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-[var(--cream)] leading-[1.05]">
              Crafted On Steel. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-red)]">
                Smashed To Perfection.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-[var(--cream-muted)] max-w-xl leading-relaxed">
              We ditched mass production for raging 500°F cast iron plates, 100% grass-fed Angus beef, and 24-hour buttermilk brined crispy chicken. Every order cooked fresh on demand.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/menu">
                <Button variant="primary" size="lg" className="gap-2 shadow-2xl">
                  <span>Explore Full Menu</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" size="lg">
                  Brand Story & 3D Lab
                </Button>
              </Link>
            </div>

            {/* Micro Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-8 border-t border-[var(--border-glass)]">
              <div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--cream)]">30m</p>
                <p className="text-xs text-[var(--cream-muted)]">Average Delivery</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--cream)]">100%</p>
                <p className="text-xs text-[var(--cream-muted)]">Grass-Fed Angus</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black tabular-nums text-[var(--cream)]">4.9★</p>
                <p className="text-xs text-[var(--cream-muted)]">Culinary Score</p>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden glass-panel-strong p-2 border border-[var(--border-glass-strong)] shadow-2xl">
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900">
                <Image
                  src="https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1000&q=85"
                  alt="The Truffle Umami Smashed Burger"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 500px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 p-4 rounded-2xl glass-panel-strong border border-white/10 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)]">
                      Chef Special
                    </span>
                    <span className="text-sm font-black tabular-nums text-white">
                      $15.99
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-1">
                    The Truffle Umami Smash
                  </h4>
                  <p className="text-xs text-neutral-300 line-clamp-1 mt-0.5">
                    Double Angus, wild porcini aioli, melted smoked gouda.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Navigation Bar */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between pb-6 border-b border-[var(--border-glass)]">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
                Browse Categories
              </h2>
              <p className="text-xl sm:text-2xl font-bold text-[var(--cream)] mt-1">
                Explore The Kitchen
              </p>
            </div>
            <Link
              href="/menu"
              className="text-xs font-bold text-[var(--accent-orange)] hover:underline flex items-center gap-1"
            >
              <span>View All Items</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu#${cat.slug}`}
                className="group relative flex flex-col items-center p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-glass)] hover:border-[var(--accent-red)]/50 transition-all duration-200 text-center"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden mb-3 border border-white/10 group-hover:scale-110 transition-transform">
                  <Image
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[var(--cream)] group-hover:text-[var(--accent-orange)] transition-colors">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured Masterpieces */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-red)]">
                Culinary Highlights
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[var(--cream)] mt-1 font-display">
                Featured Signatures
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--cream-muted)] max-w-md">
              Hand-pressed patties, custom aged cheese blends, and house-made artisan sauces that define the Smash & Sizzle standard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item, idx) => (
              <ScrollReveal key={item.id} animation="fade-up" delayMs={idx * 100}>
                <ProductCard item={item} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Why Smash & Sizzle (Pillars of Craft) */}
      <section className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-7xl rounded-3xl glass-panel-strong p-8 sm:p-12 border border-[var(--border-glass)]">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
              Our Standard
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-display text-[var(--cream)]">
              Real Food. Raging Iron. No Shortcuts.
            </h2>
            <p className="text-xs sm:text-sm text-[var(--cream-muted)]">
              Fast food does not have to mean chemical fillers and frozen patties. Here is how we redefine the quick-service kitchen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 p-6 rounded-2xl bg-[var(--surface-dark)] border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-red)]/20 text-[var(--accent-red)] flex items-center justify-center">
                <Flame className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--cream)]">500°F Hard Steel Sear</h3>
              <p className="text-xs text-[var(--cream-muted)] leading-relaxed">
                By smashing cold Angus beef directly onto screaming cast iron, we trigger the Maillard reaction to create an ultra-crispy lace crust with juicy centers.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-[var(--surface-dark)] border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--cream)]">Pasture Raised & Hormone Free</h3>
              <p className="text-xs text-[var(--cream-muted)] leading-relaxed">
                100% single-source grass-fed beef from regenerative ranches. Never treated with antibiotics or synthetic hormones.
              </p>
            </div>

            <div className="space-y-3 p-6 rounded-2xl bg-[var(--surface-dark)] border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] flex items-center justify-center">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[var(--cream)]">Scratch-Made Daily</h3>
              <p className="text-xs text-[var(--cream-muted)] leading-relaxed">
                Our brioche is baked fresh each morning. Pickles are fermented in-house. Shakes are hand-spun with whole vanilla bean custard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Complete Kitchen Menu List */}
      <section id="menu" className="px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="text-left space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-red)]">
              Prepared Fresh To Order
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
              The Full Kitchen Lineup
            </h2>
          </div>

          {categories.map((category) => {
            const categoryItems = allItems.filter((i) => i.categoryId === category.id);

            return (
              <div key={category.id} id={category.slug} className="space-y-6 pt-6">
                <div className="flex items-baseline justify-between border-b border-[var(--border-glass)] pb-3">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--cream)]">
                      {category.name}
                    </h3>
                    <p className="text-xs text-[var(--cream-muted)] mt-0.5">
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
