"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sparkles, RotateCw } from "lucide-react";

export function advanceBurgerRotationAngle(
  currentAngle: number,
  isRotating: boolean,
  step = 0.008
): number {
  return isRotating ? currentAngle + step : currentAngle;
}

export function BurgerCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(isRotating);
  const rotationAngleRef = useRef(0);

  // Keep the latest rotation state available to the animation loop without recreating the scene
  useEffect(() => {
    isRotatingRef.current = isRotating;
  }, [isRotating]);

  // Initialize Three.js scene and WebGL renderer once on mount; clean up all GPU resources on unmount
  useEffect(() => {
    // Check prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReducedMotion(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 1.5, 6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffecd2, 2.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff6b35, 2.0);
    rimLight.position.set(-5, -2, -5);
    scene.add(rimLight);

    // 3. Procedural Burger Stack Geometry
    const burgerGroup = new THREE.Group();

    // Top Bun (Glossy Brioche Dome)
    const bunTopGeo = new THREE.SphereGeometry(1.5, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const bunMat = new THREE.MeshStandardMaterial({
      color: 0xc68642,
      roughness: 0.35,
      metalness: 0.1,
    });
    const bunTop = new THREE.Mesh(bunTopGeo, bunMat);
    bunTop.position.y = 0.9;
    burgerGroup.add(bunTop);

    // Smashed Patty 1 (Dark crisped beef)
    const pattyGeo = new THREE.CylinderGeometry(1.6, 1.65, 0.35, 32);
    const pattyMat = new THREE.MeshStandardMaterial({
      color: 0x3d2314,
      roughness: 0.9,
    });
    const patty1 = new THREE.Mesh(pattyGeo, pattyMat);
    patty1.position.y = 0.45;
    burgerGroup.add(patty1);

    // Melted Gouda / Cheddar Cheese
    const cheeseGeo = new THREE.BoxGeometry(2.3, 0.08, 2.3);
    const cheeseMat = new THREE.MeshStandardMaterial({
      color: 0xffa500,
      roughness: 0.25,
    });
    const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
    cheese.rotation.y = Math.PI / 4;
    cheese.position.y = 0.22;
    burgerGroup.add(cheese);

    // Smashed Patty 2
    const patty2 = new THREE.Mesh(pattyGeo, pattyMat);
    patty2.position.y = -0.05;
    burgerGroup.add(patty2);

    // Bottom Bun
    const bunBottomGeo = new THREE.CylinderGeometry(1.5, 1.4, 0.45, 32);
    const bunBottom = new THREE.Mesh(bunBottomGeo, bunMat);
    bunBottom.position.y = -0.55;
    burgerGroup.add(bunBottom);

    burgerGroup.rotation.y = rotationAngleRef.current;
    scene.add(burgerGroup);

    // 4. Animation Loop with Frameloop Control
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      rotationAngleRef.current = advanceBurgerRotationAngle(
        rotationAngleRef.current,
        isRotatingRef.current
      );
      burgerGroup.rotation.y = rotationAngleRef.current;
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    const geometries: THREE.BufferGeometry[] = [
      bunTopGeo,
      pattyGeo,
      cheeseGeo,
      bunBottomGeo,
    ];
    const materials: THREE.Material[] = [bunMat, pattyMat, cheeseMat];

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      scene.remove(burgerGroup);
      for (const geo of geometries) {
        geo.dispose();
      }
      for (const mat of materials) {
        mat.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (reducedMotion) {
    return (
      <div className="relative w-full h-[450px] rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 flex items-center justify-center p-6 text-center">
        <p className="text-sm text-[var(--cream-muted)]">
          (Interactive 3D disabled in accordance with your reduced motion settings)
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[420px] sm:h-[500px] rounded-3xl glass-panel-strong border border-[var(--border-glass)] overflow-hidden flex items-center justify-center">
      {/* 3D WebGL Canvas Target */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Interactive Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[var(--cream-muted)] pointer-events-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
          <span>Interactive 3D Geometry • 60 FPS</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsRotating((prev) => {
              const next = !prev;
              isRotatingRef.current = next;
              return next;
            });
          }}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hover:text-white transition-colors focus-ring"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>{isRotating ? "Pause Spin" : "Resume Spin"}</span>
        </button>
      </div>
    </div>
  );
}
