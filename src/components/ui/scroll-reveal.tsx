"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  animation?: "fade-up" | "fade-in" | "zoom-in" | "slide-left" | "slide-right";
  delayMs?: number;
  durationMs?: number;
  className?: string;
  threshold?: number;
}

export function ScrollReveal({
  children,
  animation = "fade-up",
  delayMs = 0,
  durationMs = 450,
  className,
  threshold = 0.1,
  ...props
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check OS-level reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setPrefersReducedMotion(true);
      setIsVisible(true);
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(currentRef);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  if (prefersReducedMotion) {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }

  const animationBaseClasses = "transition-all ease-out";

  const getHiddenStyles = () => {
    switch (animation) {
      case "fade-up":
        return "opacity-0 translate-y-7";
      case "fade-in":
        return "opacity-0";
      case "zoom-in":
        return "opacity-0 scale-95 translate-y-4";
      case "slide-left":
        return "opacity-0 -translate-x-8";
      case "slide-right":
        return "opacity-0 translate-x-8";
      default:
        return "opacity-0 translate-y-7";
    }
  };

  const visibleClasses = "opacity-100 translate-y-0 translate-x-0 scale-100";

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
      }}
      className={cn(
        animationBaseClasses,
        isVisible ? visibleClasses : getHiddenStyles(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}