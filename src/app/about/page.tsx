import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Flame, ArrowRight } from "lucide-react";
import { About3DWrapper } from "@/components/about/about-3d-wrapper";

export default function AboutPage() {
  return (
    <div className="space-y-24 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* 1. Hero Narrative Section with Static Image LCP candidate */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)]">
            <Flame className="h-4 w-4" />
            <span>The Smash & Sizzle Story</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-[var(--cream)] font-display leading-[1.05]">
            Where Culinary Rigor <br />
            <span className="text-[var(--accent-red)]">Meets Street Speed.</span>
          </h1>

          <p className="text-sm sm:text-base text-[var(--cream-muted)] leading-relaxed">
            Founded in 2024 by fine-dining chefs tired of lifeless fast-food, Smash & Sizzle was born out of a single obsession: What happens when you apply Michelin-level ingredient standards to the classic American burger stand?
          </p>

          <div className="flex items-center gap-4 pt-2">
            <Link href="/menu">
              <Button variant="primary" size="lg" className="gap-2">
                <span>Taste The Difference</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* LCP Poster Image */}
        <div className="lg:col-span-5">
          <div className="relative aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden glass-panel-strong p-2 border border-[var(--border-glass)] shadow-2xl">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900">
              <Image
                src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80"
                alt="Chef preparing fresh smash burgers on 500 degree steel"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 500px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Scroll-Driven Cinematic Story Scroller */}
      <section className="relative w-full">
        <div className="text-center max-w-3xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-red)]">
            Cinematic Craft Sequence
          </span>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
            The Smashed Anatomy
          </h2>
          <p className="text-xs sm:text-sm text-[var(--cream-muted)] max-w-xl mx-auto">
            Scroll down naturally to play through our multi-stage culinary build. Watch cold grass-fed Angus, artisan brioche, and smoked gouda come together on raging 500°F steel.
          </p>
        </div>

        <About3DWrapper />
      </section>

      {/* 3. The Three Pillars of Quality */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-red)]/20 text-[var(--accent-red)] flex items-center justify-center font-bold text-lg">
            01
          </div>
          <h3 className="text-xl font-bold text-white font-display">Regenerative Grass-Fed Beef</h3>
          <p className="text-xs sm:text-sm text-[var(--cream-muted)] leading-relaxed">
            Our cattle roam open pastures 365 days a year. We grind our custom 80/20 chuck, brisket, and short-rib blend in-house every morning. No frozen patties, ever.
          </p>
        </div>

        <div className="p-8 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] flex items-center justify-center font-bold text-lg">
            02
          </div>
          <h3 className="text-xl font-bold text-white font-display">Slow-Fermented Brioche</h3>
          <p className="text-xs sm:text-sm text-[var(--cream-muted)] leading-relaxed">
            Our bakery fires up at 4:00 AM. Using cultured French butter and organic flour, our buns ferment for 18 hours before being toasted with clarified ghee on the flat-top.
          </p>
        </div>

        <div className="p-8 rounded-3xl glass-panel-strong border border-[var(--border-glass)] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] flex items-center justify-center font-bold text-lg">
            03
          </div>
          <h3 className="text-xl font-bold text-white font-display">Scratch Sauces & Pickles</h3>
          <p className="text-xs sm:text-sm text-[var(--cream-muted)] leading-relaxed">
            We ferment our cucumbers in kosher salt brine with fresh dill and peppercorns. Our truffle aioli and habanero bacon jam are simmered in small 5-gallon batches.
          </p>
        </div>
      </section>

      {/* 4. Bottom Brand Call to Action */}
      <section className="p-10 sm:p-14 rounded-3xl bg-gradient-to-r from-[var(--surface-dark)] to-black border border-[var(--border-glass)] text-center space-y-6">
        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white font-display max-w-xl mx-auto">
          Ready to Taste What Fast Food Was Meant to Be?
        </h2>
        <p className="text-xs sm:text-sm text-[var(--cream-muted)] max-w-lg mx-auto">
          Order for delivery in under 35 minutes or pickup fresh from your nearest kitchen.
        </p>
        <Link href="/menu" className="inline-block">
          <Button variant="primary" size="lg" className="shadow-2xl">
            Order Smashed & Fresh Now
          </Button>
        </Link>
      </section>
    </div>
  );
}