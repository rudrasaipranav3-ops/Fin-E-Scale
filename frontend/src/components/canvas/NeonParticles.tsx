"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

/* =========================================================
   PARTICLE CONFIGURATION
========================================================= */

const PARTICLE_COUNT = 3000;
const PARTICLE_SPREAD = 16;

/*
  Neon color palette
  Violet : #8B5CF6
  Blue   : #3B82F6
  Golden : #FFEA00
*/

const NEON_COLORS = [
  new THREE.Color("#8B5CF6"),
  new THREE.Color("#3B82F6"),
  new THREE.Color("#FFEA00"),
];

/* =========================================================
   NEON PARTICLES
========================================================= */

function NeonParticles() {
  const pointsRef = useRef<THREE.Points>(null);

  /* -------------------------------------------------------
     Generate random particle positions
  ------------------------------------------------------- */

  const positions = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const index = i * 3;

      array[index] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;

      array[index + 1] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;

      array[index + 2] =
        (Math.random() - 0.5) * PARTICLE_SPREAD;
    }

    return array;
  }, []);

  /* -------------------------------------------------------
     Store original positions

     Animation is calculated relative to these positions.
     This prevents particles from drifting away.
  ------------------------------------------------------- */

  const originalPositions = useMemo(() => {
    return new Float32Array(positions);
  }, [positions]);

  /* -------------------------------------------------------
     Generate individual particle colors
  ------------------------------------------------------- */

  const colors = useMemo(() => {
    const array = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const index = i * 3;

      const color =
        NEON_COLORS[
          Math.floor(Math.random() * NEON_COLORS.length)
        ];

      array[index] = color.r;
      array[index + 1] = color.g;
      array[index + 2] = color.b;
    }

    return array;
  }, []);

  /* =======================================================
     ANIMATION LOOP
  ======================================================= */

  useFrame((state) => {
    if (!pointsRef.current) return;

    const elapsedTime = state.clock.elapsedTime;

    /* -----------------------------------------------------
       Mouse / pointer parallax
    ----------------------------------------------------- */

    const mouseX = state.pointer.x;
    const mouseY = state.pointer.y;

    const targetRotationX =
      mouseY * 0.12 + elapsedTime * 0.015;

    const targetRotationY =
      mouseX * 0.12 + elapsedTime * 0.02;

    pointsRef.current.rotation.x =
      THREE.MathUtils.lerp(
        pointsRef.current.rotation.x,
        targetRotationX,
        0.025
      );

    pointsRef.current.rotation.y =
      THREE.MathUtils.lerp(
        pointsRef.current.rotation.y,
        targetRotationY,
        0.025
      );

    /* -----------------------------------------------------
       Particle wave movement
    ----------------------------------------------------- */

    const positionAttribute =
      pointsRef.current.geometry.attributes.position;

    const currentPositions =
      positionAttribute.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const index = i * 3;

      const originalX = originalPositions[index];
      const originalY = originalPositions[index + 1];
      const originalZ = originalPositions[index + 2];

      /* X-axis wave */

      currentPositions[index] =
        originalX +
        Math.sin(
          elapsedTime * 0.7 + i * 0.1
        ) *
          0.08;

      /* Y-axis wave */

      currentPositions[index + 1] =
        originalY +
        Math.cos(
          elapsedTime * 0.6 + i * 0.15
        ) *
          0.08;

      /* Z-axis wave */

      currentPositions[index + 2] =
        originalZ +
        Math.sin(
          elapsedTime * 0.5 + i * 0.2
        ) *
          0.05;
    }

    positionAttribute.needsUpdate = true;
  });

  /* =======================================================
     PARTICLE RENDER
  ======================================================= */

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
        size={0.055}
        sizeAttenuation
        depthWrite={false}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

/* =========================================================
   THREE.JS CANVAS
========================================================= */

export function NeonParticlesCanvas() {
  return (
    <div
      className="
        absolute
        inset-0
        h-full
        w-full
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
        <NeonParticles />
      </Canvas>
    </div>
  );
}