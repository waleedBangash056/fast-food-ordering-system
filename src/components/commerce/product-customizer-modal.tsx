"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { type SeedMenuItem, type SeedModifierOption } from "@/lib/db/seed-data";
import { useCart } from "@/features/cart/cart-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatMinorUnits, cn } from "@/lib/utils";
import { Plus, Minus, Check } from "lucide-react";

interface ProductCustomizerModalProps {
  item: SeedMenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductCustomizerModal({
  item,
  isOpen,
  onClose,
}: ProductCustomizerModalProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, SeedModifierOption[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Initialize defaults whenever item changes or modal opens
  React.useEffect(() => {
    if (item && item.modifierGroups) {
      const defaults: Record<string, SeedModifierOption[]> = {};
      for (const group of item.modifierGroups) {
        const defaultOptions = group.options.filter((opt) => opt.isDefault);
        if (defaultOptions.length > 0) {
          defaults[group.name] = defaultOptions;
        } else if (group.selectionType === "SINGLE" && group.options.length > 0) {
          defaults[group.name] = [group.options[0]];
        } else {
          defaults[group.name] = [];
        }
      }
      setSelectedModifiers(defaults);
      setQuantity(1);
      setSpecialInstructions("");
    }
  }, [item, isOpen]);

  const handleSingleSelect = (groupName: string, option: SeedModifierOption) => {
    setSelectedModifiers((prev) => ({
      ...prev,
      [groupName]: [option],
    }));
  };

  const handleMultipleToggle = (groupName: string, option: SeedModifierOption, maxSelections: number) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupName] || [];
      const exists = current.some((opt) => opt.id === option.id);

      if (exists) {
        return {
          ...prev,
          [groupName]: current.filter((opt) => opt.id !== option.id),
        };
      }

      if (current.length >= maxSelections) {
        return prev; // Reached max allowed selections
      }

      return {
        ...prev,
        [groupName]: [...current, option],
      };
    });
  };

  const unitPriceMinor = useMemo(() => {
    if (!item) return 0;
    let total = item.basePriceMinor;
    for (const group of Object.values(selectedModifiers)) {
      for (const opt of group) {
        total += opt.priceDeltaMinor;
      }
    }
    return total;
  }, [item, selectedModifiers]);

  const totalPriceMinor = unitPriceMinor * quantity;

  const handleAddToCart = () => {
    if (!item) return;
    addItem(item, selectedModifiers, quantity, specialInstructions);
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={item.name}
      description={item.description}
    >
      <div className="space-y-6">
        {/* Item Hero Image */}
        <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-neutral-900 border border-white/10">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 540px"
            className="object-cover"
          />
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full glass-panel-strong text-xs font-semibold text-[var(--cream)]">
            {item.calories ? `${item.calories} kcal` : "Craft Quality"}
          </div>
        </div>

        {/* Modifier Groups */}
        {item.modifierGroups && item.modifierGroups.length > 0 ? (
          <div className="space-y-5">
            {item.modifierGroups.map((group) => {
              const currentSelections = selectedModifiers[group.name] || [];

              return (
                <div key={group.id} className="space-y-2.5 pb-4 border-b border-[var(--border-glass)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--cream)] uppercase tracking-wide">
                        {group.name}
                      </h4>
                      <p className="text-xs text-[var(--cream-muted)]">
                        {group.selectionType === "SINGLE"
                          ? "Select one option (Required)"
                          : `Choose up to ${group.maxSelections} options`}
                      </p>
                    </div>
                    {group.isRequired && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/40">
                        Required
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {group.options.map((option) => {
                      const isSelected = currentSelections.some((opt) => opt.id === option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            if (group.selectionType === "SINGLE") {
                              handleSingleSelect(group.name, option);
                            } else {
                              handleMultipleToggle(group.name, option, group.maxSelections);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 focus-ring",
                            isSelected
                              ? "bg-[var(--accent-red)]/15 border-[var(--accent-red)] text-white"
                              : "bg-[var(--surface-dark)] border-[var(--border-glass)] text-[var(--cream-muted)] hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center border transition-colors",
                                isSelected
                                  ? "border-[var(--accent-red)] bg-[var(--accent-red)] text-white"
                                  : "border-neutral-500 bg-transparent"
                              )}
                            >
                              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold">{option.name}</span>
                          </div>
                          <span className="text-xs font-semibold tabular-nums">
                            {option.priceDeltaMinor > 0 ? `+${formatMinorUnits(option.priceDeltaMinor)}` : "Free"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Special Instructions */}
        <div className="space-y-1.5">
          <label
            htmlFor="special-instructions"
            className="block text-xs font-bold uppercase tracking-wide text-[var(--cream-muted)]"
          >
            Special Instructions
          </label>
          <input
            id="special-instructions"
            type="text"
            placeholder="e.g. Extra napkins, no sauce on top..."
            maxLength={150}
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full rounded-xl bg-[var(--surface-dark)] px-4 py-2.5 text-xs text-[var(--cream)] placeholder:text-neutral-500 border border-[var(--border-glass)] focus:outline-none focus:border-[var(--accent-orange)]"
          />
        </div>

        {/* Quantity Stepper & Add Button */}
        <div className="flex items-center gap-4 pt-2">
          <div className="inline-flex items-center border border-[var(--border-glass)] rounded-full p-1 bg-[var(--surface-dark)]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 disabled:opacity-30 focus-ring"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums text-[var(--cream)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 focus-ring"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handleAddToCart}
            className="flex-1 justify-between text-sm sm:text-base font-bold shadow-xl"
          >
            <span>Add to Order</span>
            <span className="tabular-nums font-bold">
              {formatMinorUnits(totalPriceMinor)}
            </span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
