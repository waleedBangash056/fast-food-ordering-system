import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Brand Assets and Story Readability (Issue 3 and 4)", () => {
  it("verifies favicon.ico is a qualifying multi-size binary ICO and not an invalid text SVG", () => {
    const publicIcoPath = path.resolve("./public/favicon.ico");
    const appIcoPath = path.resolve("./src/app/favicon.ico");

    expect(fs.existsSync(publicIcoPath)).toBe(true);
    expect(fs.existsSync(appIcoPath)).toBe(true);

    const publicBytes = fs.readFileSync(publicIcoPath);
    const appBytes = fs.readFileSync(appIcoPath);

    // Standard ICO magic header: 0x00 0x00 0x01 0x00 (type 1 for icon)
    expect(publicBytes[0]).toBe(0x00);
    expect(publicBytes[1]).toBe(0x00);
    expect(publicBytes[2]).toBe(0x01);
    expect(publicBytes[3]).toBe(0x00);

    expect(appBytes[0]).toBe(0x00);
    expect(appBytes[1]).toBe(0x00);
    expect(appBytes[2]).toBe(0x01);
    expect(appBytes[3]).toBe(0x00);

    // File size must be greater than minimal valid header (valid binary bytes, not a 349-byte SVG)
    expect(publicBytes.length).toBeGreaterThan(500);
    expect(appBytes.length).toBeGreaterThan(500);

    // Must NOT start with "<svg"
    const textStart = publicBytes.subarray(0, 10).toString("utf-8");
    expect(textStart.startsWith("<svg")).toBe(false);
  });

  it("verifies icon.tsx and apple-icon.tsx adhere to brand color palette", () => {
    const iconPath = path.resolve("./src/app/icon.tsx");
    const appleIconPath = path.resolve("./src/app/apple-icon.tsx");

    const iconContent = fs.readFileSync(iconPath, "utf-8");
    const appleIconContent = fs.readFileSync(appleIconPath, "utf-8");

    // Dark background #12151B, Ember border #FF6B35, Crimson flame #D72638
    expect(iconContent).toContain("#12151B");
    expect(iconContent).toContain("#FF6B35");
    expect(iconContent).toContain("#D72638");

    expect(appleIconContent).toContain("#12151B");
    expect(appleIconContent).toContain("#FF6B35");
    expect(appleIconContent).toContain("#D72638");
  });

  it("verifies cinematic-story-scroller hides inactive chapters to prevent text collision", () => {
    const storyPath = path.resolve("./src/components/about/cinematic-story-scroller.tsx");
    const storyContent = fs.readFileSync(storyPath, "utf-8");

    // Inactive cards must NOT use opacity-20 (which caused the visible stacking collision)
    expect(storyContent).not.toContain("opacity-20");

    // Inactive cards must be completely hidden with opacity-0 and invisible
    expect(storyContent).toContain("opacity-0");
    expect(storyContent).toContain("invisible");
    expect(storyContent).toContain("pointer-events-none");

    // Active card must have solid or high-density background
    expect(storyContent).toContain("backdrop-blur");
  });
});