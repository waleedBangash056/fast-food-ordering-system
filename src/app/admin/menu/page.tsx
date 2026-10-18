"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Flame,
  Layers,
  Lock,
  Sparkles,
  Tag,
  DollarSign,
  Clock,
  Zap,
  X,
} from "lucide-react";
import { useAdminSession } from "../admin-shell";
import { isRoleAuthorized } from "@/lib/auth/session";
import type { SeedMenuItem, SeedCategory } from "@/lib/db/seed-data";

export default function AdminMenuPage() {
  const { session } = useAdminSession();
  const [items, setItems] = useState<SeedMenuItem[]>([]);
  const [categories, setCategories] = useState<SeedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New item form state
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "cat-1",
    basePrice: "14.99",
    description: "",
    prepTimeMinutes: "8",
    calories: "750",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    isHalal: true,
    isGlutenFree: false,
    isVegan: false,
    isVegetarian: false,
    isSpicy: false,
  });

  const isAuthorized = session ? isRoleAuthorized(session.role, "MENU_WRITE") : false;

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/menu");
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message || json.message || "Failed to load catalog data");
      }
      setItems(json.data.items);
      setCategories(json.data.categories);
    } catch (err: any) {
      setNotification({ type: "error", message: err?.message || "Failed to load catalog data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleStock = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAvailable: !currentStatus,
          actorRole: session?.role || "ADMIN",
          actorId: session?.userId || "usr-admin-1",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Failed to update item");

      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isAvailable: !currentStatus } : i))
      );
      setNotification({
        type: "success",
        message: `Stock updated: item is now ${!currentStatus ? "In Stock" : "Sold Out"}`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotification(null);

    try {
      const priceMinor = Math.round(parseFloat(formData.basePrice) * 100);
      if (isNaN(priceMinor) || priceMinor <= 0) {
        throw new Error("Please enter a valid price in USD.");
      }

      const res = await fetch("/api/v1/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          basePriceMinor: priceMinor,
          description: formData.description,
          prepTimeMinutes: parseInt(formData.prepTimeMinutes) || 10,
          calories: parseInt(formData.calories) || 650,
          imageUrl: formData.imageUrl,
          isHalal: formData.isHalal,
          isGlutenFree: formData.isGlutenFree,
          isVegan: formData.isVegan,
          isVegetarian: formData.isVegetarian,
          isSpicy: formData.isSpicy,
          actorRole: session?.role || "ADMIN",
          actorId: session?.userId || "usr-admin-1",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to create menu item");
      }

      setNotification({
        type: "success",
        message: `Success! Added '${formData.name}' to the live menu catalog.`,
      });
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        categoryId: "cat-1",
        basePrice: "14.99",
        description: "",
        prepTimeMinutes: "8",
        calories: "750",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
        isHalal: true,
        isGlutenFree: false,
        isVegan: false,
        isVegetarian: false,
        isSpicy: false,
      });
      fetchMenu();
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If role is not authorized for Menu Management
  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-[#12151B] border border-white/10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center mx-auto">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-white">
          Executive Admin Clearance Required
        </h2>
        <p className="text-xs text-[var(--cream-muted)] max-w-md mx-auto">
          Your current session role (<span className="font-mono text-[var(--accent-orange)]">{session?.role}</span>) does not have authorization to add or modify menu items. Please switch to the <span className="text-white font-bold">ADMIN</span> role using the top navigation bar.
        </p>
        <div className="pt-4 flex justify-center">
          <Link
            href={session?.role === "KITCHEN_OPERATOR" ? "/admin/kitchen" : "/admin/orders"}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-orange)] text-black text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
          >
            <span>Go to Permitted Station ({session?.role === "KITCHEN_OPERATOR" ? "Kitchen Terminal" : "Order Register"})</span>
          </Link>
        </div>
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "ALL" || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#12151B] p-6 rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-orange)] mb-1">
            <Layers className="h-4 w-4" />
            <span>Catalog & Operations Management</span>
          </div>
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white">
            Menu Item Engine
          </h1>
          <p className="text-xs text-[var(--cream-muted)] mt-1">
            Authoritative menu master table: add items, update prices, and toggle real-time stock availability.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-orange)] hover:opacity-95 text-white font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-[var(--accent-red)]/20 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Menu Item</span>
        </button>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
              selectedCategory === "ALL"
                ? "bg-[var(--accent-orange)] text-black"
                : "bg-white/5 hover:bg-white/10 text-neutral-300"
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
                selectedCategory === c.id
                  ? "bg-[var(--accent-orange)] text-black"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#12151B] border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
          />
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-[#12151B] rounded-3xl border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--cream)]">
            <thead className="border-b border-white/10 bg-black/40 text-neutral-400 uppercase tracking-wider text-[11px] font-mono">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Prep Time</th>
                <th className="p-4">Dietary Tags</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    Loading catalog items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    No menu items found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{item.name}</div>
                          <div className="text-[11px] font-mono text-neutral-400">{item.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-white/5 text-neutral-300 font-medium">
                        {categories.find((c) => c.id === item.categoryId)?.name || item.categoryId}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-white text-sm">
                      ${(item.basePriceMinor / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-neutral-400 font-mono">
                      {item.prepTimeMinutes} mins
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {item.isHalal && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Halal
                          </span>
                        )}
                        {item.isGlutenFree && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            GF
                          </span>
                        )}
                        {item.isVegan && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 border border-green-500/20">
                            Vegan
                          </span>
                        )}
                        {item.isSpicy && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">
                            Spicy
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.isAvailable
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border border-red-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isAvailable ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                          }`}
                        />
                        <span>{item.isAvailable ? "In Stock" : "Sold Out"}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStock(item.id, item.isAvailable ?? true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          item.isAvailable
                            ? "bg-red-500/15 hover:bg-red-500/25 text-red-300"
                            : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
                        }`}
                      >
                        {item.isAvailable ? "Mark Sold Out" : "Mark Available"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Item Modal Dialog */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#12151B] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-orange)]/20 text-[var(--accent-orange)] flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-black uppercase tracking-tight text-white">
                    Add New Menu Item
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Creates an authoritative menu item with instant catalog update and audit record.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Truffle Umami Double Smash"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--accent-orange)]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-neutral-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Base Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="14.99"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Prep Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.prepTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, prepTimeMinutes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)] font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Artisanal description of patties, bun, glaze, and seasoning..."
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent-orange)]"
                  />
                </div>
              </div>

              {/* Dietary Flags */}
              <div className="pt-2">
                <span className="text-xs font-bold text-neutral-300 block mb-2">
                  Dietary & Culinary Attributes:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isHalal}
                      onChange={(e) => setFormData({ ...formData, isHalal: e.target.checked })}
                      className="rounded accent-[var(--accent-orange)]"
                    />
                    <span>Halal</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isGlutenFree}
                      onChange={(e) => setFormData({ ...formData, isGlutenFree: e.target.checked })}
                      className="rounded accent-[var(--accent-orange)]"
                    />
                    <span>Gluten-Free</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isVegan}
                      onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                      className="rounded accent-[var(--accent-orange)]"
                    />
                    <span>Vegan</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isVegetarian}
                      onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                      className="rounded accent-[var(--accent-orange)]"
                    />
                    <span>Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={formData.isSpicy}
                      onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                      className="rounded accent-[var(--accent-orange)]"
                    />
                    <span>Spicy</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl hover:bg-white/10 text-xs font-semibold text-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-red)] to-[var(--accent-orange)] text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[var(--accent-red)]/20"
                >
                  {isSubmitting ? "Creating Item..." : "Publish to Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
