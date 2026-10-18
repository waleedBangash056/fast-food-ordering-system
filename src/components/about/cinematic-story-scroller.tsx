"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Flame, Clock, Award, Sparkles, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chapter {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  narrative: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CHAPTERS: Chapter[] = [
  {
    id: "chap-1",
    step: "01",
    title: "The Bakery Dawn",
    subtitle: "18-Hour Brioche Fermentation",
    narrative:
      "Every morning at 4:00 AM, our bakeries prepare the foundation. Organic unbleached flour, European cultured butter, and farm eggs ferment for 18 hours to develop a rich, pillowy crumb toasted in clarified ghee on screaming steel.",
    badge: "The Foundation",
    icon: ChefHat,
  },
  {
    id: "chap-2",
    step: "02",
    title: "500°F Hard Steel Sear",
    subtitle: "Regenerative Angus & Maillard Crust",
    narrative:
      "We grind our custom 80/20 chuck, brisket, and short-rib blend daily. Smashed paper-thin on 500°F cast iron, cold beef meets raging heat to trigger the ultimate Maillard reaction: a lace-crisped exterior holding intense savory juices.",
    badge: "The Sear",
    icon: Flame,
  },
  {
    id: "chap-3",
    step: "03",
    title: "Smoked Gouda & Truffle",
    subtitle: "Slow-Melted Artisan Cheese & Wild Porcini",
    narrative:
      "As steam rises, thick slabs of 12-month Dutch smoked gouda and sharp aged cheddar melt across every searing ridge. Finished with small-batch wild porcini and black truffle aioli simmered in house.",
    badge: "The Fusion",
    icon: Sparkles,
  },
  {
    id: "chap-4",
    step: "04",
    title: "The Crown & Sizzle",
    subtitle: "Assembled Fresh On Demand",
    narrative:
      "Capped with the toasted crown, house-fermented dill pickles, and seasoned with Maldon sea salt flakes. Delivered in 30 minutes or handed across the pass at peak sizzle. Zero warming trays, zero compromises.",
    badge: "The Masterpiece",
    icon: Award,
  },
];

export function CinematicStoryScroller() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [webGlSupported, setWebGlSupported] = useState(true);

  // References for Three.js scene objects
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    burgerGroup: THREE.Group;
    bunBottomMesh: THREE.Mesh;
    patty1Mesh: THREE.Mesh;
    cheeseMesh: THREE.Mesh;
    patty2Mesh: THREE.Mesh;
    sauceGroup: THREE.Group;
    bunTopMesh: THREE.Mesh;
    disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture>;
  } | null>(null);

  // 1. Detect scroll progress through the 400vh container
  useEffect(() => {
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollableDistance = rect.height - windowHeight;

      if (totalScrollableDistance <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalScrollableDistance, 0), 1);

      setScrollProgress(progress);

      if (progress < 0.25) {
        setActiveChapterIndex(0);
      } else if (progress < 0.5) {
        setActiveChapterIndex(1);
      } else if (progress < 0.75) {
        setActiveChapterIndex(2);
      } else {
        setActiveChapterIndex(3);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. Initialize Three.js Cinematic WebGL Stage
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsReducedMotion(true);
      return;
    }

    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 7);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("WebGL renderer creation failed, falling back to static story view:", err);
      setWebGlSupported(false);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xfff8ee, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffeedd, 3.2);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xd72638, 1.8);
    fillLight.position.set(-6, -2, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff9944, 2.2);
    rimLight.position.set(0, 8, -6);
    scene.add(rimLight);

    // Flat-top griddle surface base
    const griddleGeo = new THREE.CylinderGeometry(3.5, 3.7, 0.2, 48);
    const griddleMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.25,
      metalness: 0.85,
    });
    const griddleMesh = new THREE.Mesh(griddleGeo, griddleMat);
    griddleMesh.position.y = -1.6;
    griddleMesh.receiveShadow = true;
    scene.add(griddleMesh);
    disposables.push(griddleGeo, griddleMat);

    // Burger Group
    const burgerGroup = new THREE.Group();
    scene.add(burgerGroup);

    // Materials
    const briocheMat = new THREE.MeshStandardMaterial({
      color: 0xd98b3f,
      roughness: 0.38,
      metalness: 0.08,
    });
    const beefMat = new THREE.MeshStandardMaterial({
      color: 0x2b170e,
      roughness: 0.92,
      metalness: 0.12,
    });
    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      roughness: 0.22,
      metalness: 0.05,
    });
    const sauceMat = new THREE.MeshStandardMaterial({
      color: 0x5a3311,
      roughness: 0.18,
      metalness: 0.08,
    });
    disposables.push(briocheMat, beefMat, cheeseMat, sauceMat);

    // 1. Bottom Bun
    const bunBottomGeo = new THREE.CylinderGeometry(1.65, 1.55, 0.45, 36);
    const bunBottomMesh = new THREE.Mesh(bunBottomGeo, briocheMat);
    bunBottomMesh.position.y = -1.1;
    bunBottomMesh.castShadow = true;
    burgerGroup.add(bunBottomMesh);
    disposables.push(bunBottomGeo);

    // 2. Patty 1 (Smashed Angus Patty)
    const patty1Geo = new THREE.CylinderGeometry(1.8, 1.85, 0.36, 36);
    const patty1Mesh = new THREE.Mesh(patty1Geo, beefMat);
    patty1Mesh.position.y = 4.5;
    patty1Mesh.castShadow = true;
    burgerGroup.add(patty1Mesh);
    disposables.push(patty1Geo);

    // 3. Melted Smoked Gouda & Cheddar
    const cheeseGeo = new THREE.BoxGeometry(2.5, 0.09, 2.5);
    const cheeseMesh = new THREE.Mesh(cheeseGeo, cheeseMat);
    cheeseMesh.position.y = 5.5;
    cheeseMesh.rotation.y = Math.PI / 4;
    cheeseMesh.castShadow = true;
    burgerGroup.add(cheeseMesh);
    disposables.push(cheeseGeo);

    // 4. Patty 2 (Second Smashed Patty)
    const patty2Geo = new THREE.CylinderGeometry(1.78, 1.82, 0.36, 36);
    const patty2Mesh = new THREE.Mesh(patty2Geo, beefMat);
    patty2Mesh.position.y = 6.5;
    patty2Mesh.castShadow = true;
    burgerGroup.add(patty2Mesh);
    disposables.push(patty2Geo);

    // 5. Truffle Sauce & Mushroom Glaze Drops
    const sauceGroup = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const dropGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const drop = new THREE.Mesh(dropGeo, sauceMat);
      const angle = (i / 6) * Math.PI * 2;
      drop.position.set(Math.cos(angle) * 1.7, 0, Math.sin(angle) * 1.7);
      sauceGroup.add(drop);
      disposables.push(dropGeo);
    }
    sauceGroup.position.y = 7.0;
    burgerGroup.add(sauceGroup);

    // 6. Top Brioche Bun Dome
    const bunTopGeo = new THREE.SphereGeometry(1.7, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const bunTopMesh = new THREE.Mesh(bunTopGeo, briocheMat);
    bunTopMesh.position.y = 8.0;
    bunTopMesh.castShadow = true;
    burgerGroup.add(bunTopMesh);
    disposables.push(bunTopGeo);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      burgerGroup,
      bunBottomMesh,
      patty1Mesh,
      cheeseMesh,
      patty2Mesh,
      sauceGroup,
      bunTopMesh,
      disposables,
    };

    let animId: number;
    let baseTime = 0;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      baseTime += 0.005;
      burgerGroup.position.y = Math.sin(baseTime) * 0.05;
      renderer.render(scene, camera);
    };

    renderLoop();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);

      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // 3. Scrub animation state based on scrollProgress
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    const p = scrollProgress;

    const cameraAngle = p * Math.PI * 1.5;
    const cameraRadius = 6.2 - p * 0.8;
    s.camera.position.x = Math.sin(cameraAngle) * cameraRadius;
    s.camera.position.z = Math.cos(cameraAngle) * cameraRadius;
    s.camera.position.y = 1.0 + Math.sin(p * Math.PI) * 0.8;
    s.camera.lookAt(0, -0.2, 0);

    const patty1Progress = Math.min(Math.max((p - 0.12) / 0.22, 0), 1);
    s.patty1Mesh.position.y = THREE.MathUtils.lerp(4.5, -0.65, Math.pow(patty1Progress, 2));

    const cheeseProgress = Math.min(Math.max((p - 0.32) / 0.22, 0), 1);
    s.cheeseMesh.position.y = THREE.MathUtils.lerp(5.5, -0.42, Math.pow(cheeseProgress, 2));

    const patty2Progress = Math.min(Math.max((p - 0.45) / 0.22, 0), 1);
    s.patty2Mesh.position.y = THREE.MathUtils.lerp(6.5, -0.12, Math.pow(patty2Progress, 2));

    const sauceProgress = Math.min(Math.max((p - 0.58) / 0.20, 0), 1);
    s.sauceGroup.position.y = THREE.MathUtils.lerp(7.0, 0.12, Math.pow(sauceProgress, 2));

    const bunTopProgress = Math.min(Math.max((p - 0.68) / 0.25, 0), 1);
    s.bunTopMesh.position.y = THREE.MathUtils.lerp(8.0, 0.18, Math.pow(bunTopProgress, 2));
  }, [scrollProgress]);

  return (
    <div
      ref={containerRef}
      className="relative h-[380vh] w-full"
      aria-label="Interactive culinary assembly story scroller"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-16 pb-8 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-orange)]">
              Interactive Story Scroller
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-neutral-400 tabular-nums">
                Chapter 0{activeChapterIndex + 1} / 04
              </span>
              <div className="w-28 sm:w-44 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-red)] transition-all duration-75"
                  style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-[var(--cream)] tabular-nums">
                {Math.round(scrollProgress * 100)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center flex-1 my-4 relative z-10">
          <div className="lg:col-span-5 relative flex flex-col justify-center space-y-6">
            {/* Quick Chapter Selector Pills */}
            <div className="flex items-center gap-1.5 mb-2">
              {CHAPTERS.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const targetProg = (i + 0.5) / 4;
                    const cElem = containerRef.current;
                    if (cElem) {
                      const elemTop = cElem.getBoundingClientRect().top + window.scrollY;
                      const scrollY = elemTop + targetProg * (cElem.clientHeight - window.innerHeight);
                      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      window.scrollTo({ top: scrollY, behavior: prefersReduced ? "auto" : "smooth" });
                    }
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-mono font-bold transition-all",
                    i === activeChapterIndex
                      ? "bg-[var(--accent-orange)] text-[#0A0C0E] shadow-md shadow-[var(--accent-orange)]/30 font-extrabold"
                      : "bg-white/5 hover:bg-white/10 text-neutral-400"
                  )}
                >
                  {c.step}
                </button>
              ))}
            </div>

            {CHAPTERS.map((chap, idx) => {
              const isActive = idx === activeChapterIndex;
              const Icon = chap.icon;

              return (
                <div
                  key={chap.id}
                  aria-hidden={!isActive}
                  className={cn(
                    "transition-all duration-500 rounded-3xl p-6 sm:p-8 border",
                    isActive
                      ? "opacity-100 visible relative z-10 translate-y-0 scale-100 bg-[#12151B]/95 backdrop-blur-2xl border-[var(--accent-orange)]/60 shadow-2xl"
                      : "opacity-0 invisible pointer-events-none absolute inset-0 translate-y-8 scale-95 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-red)]/20 border border-[var(--accent-red)]/40 text-[var(--accent-red)] text-xs font-bold uppercase tracking-wider">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{chap.badge}</span>
                    </span>
                    <span className="font-display text-2xl font-black text-white/30 tabular-nums">
                      {chap.step}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                    {chap.title}
                  </h3>
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--accent-orange)] uppercase tracking-wider mt-1 mb-3">
                    {chap.subtitle}
                  </h4>
                  <p className="text-xs sm:text-sm text-[var(--cream-muted)] leading-relaxed">
                    {chap.narrative}
                  </p>

                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] font-semibold text-neutral-400">
                    <Clock className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
                    <span>Scroll down to advance culinary assembly</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-7 h-[50vh] sm:h-[65vh] relative rounded-3xl glass-panel-strong border border-[var(--border-glass)] overflow-hidden shadow-2xl flex items-center justify-center">
            {isReducedMotion ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-white">
                  (Scroll Scrubbed 3D disabled in accordance with your OS reduced-motion preferences)
                </p>
                <p className="text-xs text-[var(--cream-muted)]">
                  All 4 chapters remain fully readable as you scroll.
                </p>
              </div>
            ) : !webGlSupported ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-white">
                  (3D Hardware Acceleration Unavailable)
                </p>
                <p className="text-xs text-[var(--cream-muted)]">
                  Explore our craft story and ingredient narrative through the interactive chapter guide.
                </p>
              </div>
            ) : (
              <div ref={canvasContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            )}

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[var(--cream-muted)] pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
                <span>60 FPS WebGL • Scroll To Scrub</span>
              </span>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 font-mono text-[11px]">
                {activeChapterIndex === 3 ? "Fully Assembled" : "Culinary Assembly In Progress"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-neutral-400 py-2 border-t border-white/5 relative z-20">
          <span>↓ Scroll down to play through the 4-stage craft story • Scroll up to rewind</span>
        </div>
      </div>
    </div>
  );
}