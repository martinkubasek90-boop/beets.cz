"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Scene() {
  const clusterRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const positions = new Float32Array(700 * 3);

    for (let i = 0; i < 700; i += 1) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 22;
      positions[i3 + 1] = (Math.random() - 0.2) * 12;
      positions[i3 + 2] = (Math.random() - 0.5) * 18;
    }

    return positions;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (clusterRef.current) {
      clusterRef.current.rotation.y = t * 0.22;
      clusterRef.current.rotation.x = Math.sin(t * 0.3) * 0.08;
      clusterRef.current.position.y = Math.sin(t * 0.6) * 0.08;
    }

    if (orbRef.current) {
      orbRef.current.scale.setScalar(1 + Math.sin(t * 1.4) * 0.05);
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.55;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.02;
      particlesRef.current.position.y = Math.sin(t * 0.2) * 0.16;
    }
  });

  return (
    <>
      <color attach="background" args={["#ffffff"]} />
      <fog attach="fog" args={["#ffffff", 8, 24]} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[5, 8, 4]} intensity={1.6} color="#7eb2ff" />
      <pointLight position={[0, 1.5, 2.5]} intensity={18} color="#ffffff" />
      <pointLight position={[0, -1, -4]} intensity={8} color="#034ea2" />

      <group rotation={[-0.35, 0.3, 0]} position={[0, 0.25, 0]}>
        <gridHelper
          args={[28, 20, new THREE.Color("#86b7ff"), new THREE.Color("#d8e8ff")]}
          position={[0, -2.35, -2]}
        />

        <group ref={clusterRef}>
          <mesh ref={orbRef}>
            <icosahedronGeometry args={[1.35, 3]} />
            <meshPhysicalMaterial
              color="#ffffff"
              emissive="#7fb1ff"
              emissiveIntensity={0.28}
              transparent
              opacity={0.92}
              roughness={0.1}
              transmission={0.22}
              thickness={1}
            />
          </mesh>

          <mesh rotation={[0.6, 0.3, 0]} scale={1.35}>
            <torusGeometry args={[1.95, 0.022, 24, 220]} />
            <meshBasicMaterial color="#034ea2" transparent opacity={0.9} />
          </mesh>

          <mesh ref={ringRef} rotation={[1.15, 0.4, 0]}>
            <torusGeometry args={[2.45, 0.042, 16, 240]} />
            <meshBasicMaterial color="#7fb1ff" transparent opacity={0.55} />
          </mesh>

          <mesh rotation={[0.2, 0.9, 0.35]}>
            <torusKnotGeometry args={[0.84, 0.2, 160, 24]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#d4e7ff"
              emissiveIntensity={0.42}
              metalness={0.35}
              roughness={0.18}
              wireframe
            />
          </mesh>
        </group>

        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[particles, 3]}
              count={particles.length / 3}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#6ea8ff"
            size={0.04}
            sizeAttenuation
            transparent
            opacity={0.82}
          />
        </points>
      </group>
    </>
  );
}

export function RetrofuturisticBackground() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 7.8], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Scene />
    </Canvas>
  );
}
