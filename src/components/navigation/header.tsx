"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Utensils, Menu as MenuIcon, X, Flame } from "lucide-react";
import { useCart } from "@/features/cart/cart-context";
import { formatMinorUnits, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const { itemCount, totals, serviceMode, setServiceMode, openCartDrawer } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/menu", label: "Menu" },
    { href: "/offers", label: "Offers" },
    { href: "/locations", label: "Locations" },
    { href: "/about", label: "Our Story" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <div className="mx-auto max-w-7xl">
        <nav
          aria-label="Main Navigation"
          className="flex items-center justify-between h-16 px-4 sm:px-6 rounded-full glass-panel-strong shadow-xl text-[var(--cream)]"
        >
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 group focus-ring rounded-full px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-red)] flex items-center justify-center text-white shadow-md shadow-red-900/50 group-hover:scale-105 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase leading-none font-display text-[var(--cream)]">
                Smash & Sizzle
              </span>
              <span className="text-[10px] tracking-widest text-[var(--accent-orange)] uppercase font-semibold">
                Craft Fast-Food
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors hover:text-white px-2 py-1 rounded-md focus-ring",
                    isActive ? "text-[var(--accent-orange)] font-semibold" : "text-[var(--cream-muted)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Island: Mode Selector & Cart Trigger */}
          <div className="flex items-center gap-3">
            {/* Service Mode Selector Pill */}
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[var(--surface-dark)] border border-[var(--border-glass)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setServiceMode("DELIVERY")}
                className={cn(
                  "px-3 py-1.5 rounded-full transition-all duration-200 focus-ring",
                  serviceMode === "DELIVERY"
                    ? "bg-[var(--accent-red)] text-white shadow-sm"
                    : "text-[var(--cream-muted)] hover:text-white"
                )}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setServiceMode("PICKUP")}
                className={cn(
                  "px-3 py-1.5 rounded-full transition-all duration-200 focus-ring",
                  serviceMode === "PICKUP"
                    ? "bg-[var(--accent-red)] text-white shadow-sm"
                    : "text-[var(--cream-muted)] hover:text-white"
                )}
              >
                Pickup
              </button>
            </div>

            {/* Cart Trigger Button */}
            <button
              onClick={openCartDrawer}
              aria-label={`Open shopping cart, ${itemCount} items, total ${formatMinorUnits(totals.totalMinor)}`}
              className="relative inline-flex items-center gap-2.5 h-11 px-4 sm:px-5 rounded-full bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-lg shadow-red-950/40 transition-all active:scale-95 focus-ring"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline tabular-nums">
                {totals.totalMinor > 0 ? formatMinorUnits(totals.totalMinor) : "Cart"}
              </span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-white text-[var(--accent-red)] font-bold text-xs tabular-nums">
                {itemCount}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Navigation Menu"
              className="md:hidden p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors focus-ring"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-3xl glass-panel-strong shadow-2xl text-[var(--cream)] border border-[var(--border-glass)] space-y-4">
            <div className="flex gap-2 p-1 rounded-xl bg-[var(--surface-dark)] border border-[var(--border-glass)]">
              <button
                onClick={() => {
                  setServiceMode("DELIVERY");
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                  serviceMode === "DELIVERY"
                    ? "bg-[var(--accent-red)] text-white"
                    : "text-[var(--cream-muted)]"
                )}
              >
                Delivery
              </button>
              <button
                onClick={() => {
                  setServiceMode("PICKUP");
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                  serviceMode === "PICKUP"
                    ? "bg-[var(--accent-red)] text-white"
                    : "text-[var(--cream-muted)]"
                )}
              >
                Pickup
              </button>
            </div>

            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
