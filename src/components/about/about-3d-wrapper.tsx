"use client";

import React from "react";
import dynamic from "next/dynamic";

const CinematicStoryScroller = dynamic(
  () =>
    import("./cinematic-story-scroller").then((mod) => mod.CinematicStoryScroller),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] rounded-3xl bg-[var(--surface-dark)] border border-white/10 flex items-center justify-center text-xs text-neutral-400">
        Initializing Cinematic Story Experience...
      </div>
    ),
  }
);

export function About3DWrapper() {
  return <CinematicStoryScroller />;
}