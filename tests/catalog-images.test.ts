import { describe, it, expect } from "vitest";
import { SEED_MENU_ITEMS, SEED_CATEGORIES } from "../src/lib/db/seed-data";

describe("Catalog Images Regression Suite (Issue 1)", () => {
  it("ensures all menu item images have valid Unsplash URLs", () => {
    for (const item of SEED_MENU_ITEMS) {
      expect(item.imageUrl).toBeDefined();
      expect(item.imageUrl.startsWith("https://images.unsplash.com/")).toBe(true);
      expect(item.imageUrl).not.toContain(" ");
    }
  });

  it("ensures all category images have valid Unsplash URLs", () => {
    for (const cat of SEED_CATEGORIES) {
      expect(cat.imageUrl).toBeDefined();
      expect(cat.imageUrl.startsWith("https://images.unsplash.com/")).toBe(true);
    }
  });

  it("specifically verifies that previously broken photo IDs are not present", () => {
    const knownBrokenIds = [
      "photo-1527477321005-4d01d770c733",
      "photo-1639024471287-032f6640dc1f",
      "photo-1548340746-608f658ff9c9",
    ];

    for (const item of SEED_MENU_ITEMS) {
      for (const brokenId of knownBrokenIds) {
        expect(item.imageUrl).not.toContain(brokenId);
      }
    }
  });
});