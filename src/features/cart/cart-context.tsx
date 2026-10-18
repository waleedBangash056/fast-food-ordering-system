"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { type SeedMenuItem, type SeedModifierOption } from "@/lib/db/seed-data";
import { calculateOrderTotals, type OrderCalculationResult } from "@/lib/pricing/calculator";

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  basePriceMinor: number;
  imageUrl: string;
  quantity: number;
  selectedModifiers: Record<string, SeedModifierOption[]>;
  specialInstructions?: string;
}

interface AppliedCoupon {
  code: string;
  description: string;
  discountMinor: number;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  serviceMode: "DELIVERY" | "PICKUP";
  setServiceMode: (mode: "DELIVERY" | "PICKUP") => void;
  branchId: string;
  setBranchId: (id: string) => void;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  addItem: (
    item: SeedMenuItem,
    selectedModifiers: Record<string, SeedModifierOption[]>,
    quantity?: number,
    specialInstructions?: string
  ) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  totals: OrderCalculationResult;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [serviceMode, setServiceMode] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [branchId, setBranchId] = useState<string>("branch-1");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState<boolean>(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Helper to construct a deterministic signature for modifier combinations
  const generateCartItemId = (
    menuItemId: string,
    modifiers: Record<string, SeedModifierOption[]>
  ) => {
    const modKeys = Object.keys(modifiers).sort();
    const modSignature = modKeys
      .map((k) => `${k}:${modifiers[k].map((opt) => opt.id).sort().join(",")}`)
      .join("|");
    return `${menuItemId}_${modSignature}`;
  };

  const addItem = (
    item: SeedMenuItem,
    selectedModifiers: Record<string, SeedModifierOption[]>,
    quantity: number = 1,
    specialInstructions?: string
  ) => {
    const cartItemId = generateCartItemId(item.id, selectedModifiers);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }

      return [
        ...prevItems,
        {
          cartItemId,
          menuItemId: item.id,
          name: item.name,
          basePriceMinor: item.basePriceMinor,
          imageUrl: item.imageUrl,
          quantity,
          selectedModifiers,
          specialInstructions,
        },
      ];
    });

    setIsCartDrawerOpen(true);
    setAppliedCoupon(null);
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setAppliedCoupon(null);
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (cartItemId: string) => {
    setAppliedCoupon(null);
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const totals = useMemo(() => {
    if (items.length === 0) {
      return {
        subtotalMinor: 0,
        deliveryFeeMinor: 0,
        discountMinor: 0,
        taxMinor: 0,
        totalMinor: 0,
      };
    }

    const calcItems = items.map((item) => {
      const modifiers: Array<{ priceMinor: number }> = [];
      for (const group of Object.values(item.selectedModifiers)) {
        for (const opt of group) {
          modifiers.push({ priceMinor: opt.priceDeltaMinor });
        }
      }
      return {
        basePriceMinor: item.basePriceMinor,
        quantity: item.quantity,
        modifiers,
      };
    });

    return calculateOrderTotals({
      serviceMode,
      items: calcItems,
      deliveryFeeMinor: serviceMode === "DELIVERY" ? 499 : 0,
      discountMinor: appliedCoupon ? appliedCoupon.discountMinor : 0,
    });
  }, [items, serviceMode, appliedCoupon]);

  const applyCoupon = async (code: string) => {
    try {
      const res = await fetch("/api/v1/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceMode,
          items,
          couponCode: code,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        return {
          success: false,
          message: json.error?.message || "Invalid coupon code.",
        };
      }

      if (json.data?.appliedCoupon) {
        setAppliedCoupon(json.data.appliedCoupon);
        return {
          success: true,
          message: `Coupon '${code}' applied successfully!`,
        };
      }

      return { success: false, message: "Coupon could not be applied." };
    } catch {
      return { success: false, message: "Network error validating coupon." };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        serviceMode,
        setServiceMode,
        branchId,
        setBranchId,
        isCartDrawerOpen,
        openCartDrawer: () => setIsCartDrawerOpen(true),
        closeCartDrawer: () => setIsCartDrawerOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        totals,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
