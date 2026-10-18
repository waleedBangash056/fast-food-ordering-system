import React from "react";
import Link from "next/link";
import { catalogService } from "@/server/domains/catalog/catalog-service";
import { formatMinorUnits } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Truck, Store } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const branches = await catalogService.getBranches();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
          Our Kitchens
        </span>
        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-[var(--cream)] font-display">
          Find A Kitchen Near You
        </h1>
        <p className="text-xs sm:text-sm text-[var(--cream-muted)]">
          Every Smash & Sizzle location is equipped with screaming 500°F cast iron flat-tops and express pickup counters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {branches.map((b) => (
          <div
            key={b.id}
            className="p-6 rounded-3xl glass-panel-strong border border-[var(--border-glass)] flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[var(--accent-orange)] uppercase">
                  Open Now
                </span>
                <span className="text-xs text-neutral-400 font-semibold">
                  30-40 min delivery
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white font-display">{b.name}</h3>
                <p className="text-xs text-[var(--cream-muted)] flex items-center gap-1.5 mt-2">
                  <MapPin className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{b.address}</span>
                </p>
                <p className="text-xs text-[var(--cream-muted)] flex items-center gap-1.5 mt-1.5">
                  <Phone className="h-4 w-4 text-neutral-400 shrink-0" />
                  <span>{b.phone}</span>
                </p>
              </div>

              <div className="space-y-1.5 pt-4 border-t border-[var(--border-glass)] text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-white">{formatMinorUnits(b.deliveryFeeMinor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum Order</span>
                  <span className="font-semibold text-white">{formatMinorUnits(b.minOrderMinor)}</span>
                </div>
              </div>
            </div>

            <Link href="/menu" className="block w-full">
              <Button variant="primary" size="md" className="w-full text-xs font-bold">
                Order From This Location
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
