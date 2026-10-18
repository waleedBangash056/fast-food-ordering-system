import React from "react";
import Link from "next/link";
import { Flame, Clock, MapPin, Phone, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--border-glass)] bg-[var(--surface-dark)] text-[var(--cream)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white">
                <Flame className="h-5 w-5" />
              </div>
              <span className="font-extrabold text-base tracking-wider uppercase font-display">
                Smash & Sizzle
              </span>
            </div>
            <p className="text-xs text-[var(--cream-muted)] leading-relaxed">
              Crafting premium smashed burgers, buttermilk fried chicken, and artisanal custard shakes.
              Zero compromises on ingredient sourcing or culinary technique.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--accent-orange)] font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>100% Certified Grass-Fed Angus Beef</span>
            </div>
          </div>

          {/* Hours & Service */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
              Kitchen Hours
            </h4>
            <div className="space-y-2 text-xs text-[var(--cream-muted)]">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Mon – Thu: 11:00 AM – 10:30 PM</p>
                  <p className="text-white font-medium">Fri – Sat: 11:00 AM – Midnight</p>
                  <p className="text-white font-medium">Sunday: 11:30 AM – 10:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
              Our Locations
            </h4>
            <div className="space-y-2 text-xs text-[var(--cream-muted)]">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Downtown Flagship</p>
                  <p>742 Evergreen Blvd</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-medium">Westside Express</p>
                  <p>1280 Ocean Parkway</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links & Backoffice */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
              Navigation & Backoffice
            </h4>
            <ul className="space-y-2 text-xs text-[var(--cream-muted)]">
              <li>
                <Link href="/menu" className="hover:text-white transition-colors">
                  Full Menu & Combos
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-white transition-colors">
                  Exclusive Specials & Offers
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Our Brand Story & Craft
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Chef Inquiries & Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--border-glass)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Smash & Sizzle Co. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/locations" className="hover:text-neutral-300">Store Locations</Link>
            <Link href="/about" className="hover:text-neutral-300">About Smash & Sizzle</Link>
            <Link href="/contact" className="hover:text-neutral-300">Contact Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
