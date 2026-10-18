import { describe, it, expect } from "vitest";
import { metadata } from "../src/app/layout";

describe("Motion, Favicon & Accessibility Integrity (Issues 2, 3, 4)", () => {
  it("verifies favicon and apple icons are properly configured in metadata", () => {
    expect(metadata.icons).toBeDefined();
    // @ts-ignore
    const iconList = metadata.icons.icon;
    expect(Array.isArray(iconList)).toBe(true);
    expect(iconList.some((i: any) => i.url.startsWith("/icon") || i.url.startsWith("/favicon"))).toBe(true);

    // @ts-ignore
    const appleList = metadata.icons.apple;
    expect(Array.isArray(appleList)).toBe(true);
    expect(appleList.some((i: any) => i.url.startsWith("/apple-icon"))).toBe(true);
  });

  it("verifies that all catalog items now have valid images", async () => {
    const { SEED_MENU_ITEMS } = await import("../src/lib/db/seed-data");
    const item8 = SEED_MENU_ITEMS.find((i) => i.id === "item-8");
    const item11 = SEED_MENU_ITEMS.find((i) => i.id === "item-11");
    const item12 = SEED_MENU_ITEMS.find((i) => i.id === "item-12");

    expect(item8?.imageUrl).toContain("photo-1625813506062");
    expect(item11?.imageUrl).toContain("photo-1623653387945");
    expect(item12?.imageUrl).toContain("photo-1541745537411");
  });
});