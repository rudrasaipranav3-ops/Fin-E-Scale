"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

/* =========================================================
   CONFIGURATION
========================================================= */

const PARTICLE_COUNT = 3000;
const PARTICLE_SPREAD = 18;

const NEON_COLORS = [
  new THREE.Color("#8B5CF6"), // Violet
  new THREE.Color("#3B82F6"), // Blue
  new THREE.Color("#FFEA00"), // Golden
];

/* =========================================================
   PARTICLE SPHERE
========================================================= */

function NeonSphere() {
  const pointsRef = useRef<THREE.Points>(null);

  /* ---------------------------------------------------------
     Generate particle positions
  --------------------------------------------------------- */

  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      array[i3] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;

      array[i3 + 1] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;

      array[i3 + 2] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;
    }

    return array;
  }, []);

  /* ---------------------------------------------------------
     Generate particle colors
  --------------------------------------------------------- */

  const colors = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const color =
        NEON_COLORS[
          Math.floor(Math.random() * NEON_COLORS.length)
        ];

      const i3 = i * 3;

      array[i3] = color.r;
      array[i3 + 1] = color.g;
      array[i3 + 2] = color.b;
    }

    return array;
  }, []);

  /* ---------------------------------------------------------
     Store original particle positions

     This prevents particles from continuously drifting
     farther and farther away every frame.
  --------------------------------------------------------- */

  const originalPositions = useMemo(
    () => new Float32Array(positions),
    [positions]
  );

  /* ---------------------------------------------------------
     Mouse position
  --------------------------------------------------------- */

  const mouse = useRef({
    x: 0,
    y: 0,
  });

  /* ---------------------------------------------------------
     Animation
  --------------------------------------------------------- */

  useFrame((state) => {
    if (!pointsRef.current) return;

    const elapsedTime = state.clock.elapsedTime;

    /*
     React Three Fiber already gives us the normalized
     pointer position.

     Range:
     -1 → 1
    */

    mouse.current.x = state.pointer.x;
    mouse.current.y = state.pointer.y;

    /* -------------------------------------------------------
       Slow global rotation
    ------------------------------------------------------- */

    const targetRotationX =
      mouse.current.y * 0.12;

    const targetRotationY =
      mouse.current.x * 0.12;

    pointsRef.current.rotation.x =
      THREE.MathUtils.lerp(
        pointsRef.current.rotation.x,
        targetRotationX +
          elapsedTime * 0.015,
        0.025
      );

    pointsRef.current.rotation.y =
      THREE.MathUtils.lerp(
        pointsRef.current.rotation.y,
        targetRotationY +
          elapsedTime * 0.02,
        0.025
      );

    /* -------------------------------------------------------
       Particle wave movement
    ------------------------------------------------------- */

    const positionAttribute =
      pointsRef.current.geometry.attributes.position;

    const currentPositions =
      positionAttribute.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const originalX =
        originalPositions[i3];

      const originalY =
        originalPositions[i3 + 1];

      const originalZ =
        originalPositions[i3 + 2];

      /*
       Small wave animation.

       Because we're calculating from the ORIGINAL
       positions instead of the previous frame,
       particles don't drift infinitely.
      */

      currentPositions[i3] =
        originalX +
        Math.sin(
          elapsedTime * 0.7 + i * 0.1
        ) *
          0.08;

      currentPositions[i3 + 1] =
        originalY +
        Math.cos(
          elapsedTime * 0.6 + i * 0.15
        ) *
          0.08;

      currentPositions[i3 + 2] =
        originalZ +
        Math.sin(
          elapsedTime * 0.5 + i * 0.2
        ) *
          0.05;
    }

    positionAttribute.needsUpdate = true;
  });

  /* =========================================================
     RENDER PARTICLES
  ========================================================= */

  return (
    <Points
      ref={pointsRef}
      positions={positions}
      colors={colors}
      stride={3}
      frustumCulled={false}
    >
      <PointMaterial
        transparent
        vertexColors
        size={0.06}
        sizeAttenuation
        depthWrite={false}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

/* =========================================================
   CANVAS
========================================================= */

export function NeonParticlesCanvas() {
  return (
    <div
      className="
        pointer-events-none
        absolute
        inset-0
        z-0
        overflow-hidden
      "
    >
      <Canvas
        camera={{
          position: [0, 0, 8],
          fov: 65,
          near: 0.1,
          far: 100,
        }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <NeonSphere />
      </Canvas>
    </div>
  );
}