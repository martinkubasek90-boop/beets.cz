"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";

function FloatingPanels() {
  const sparklePositions = useMemo(() => {
    const positions = new Float32Array(520 * 3);

    for (let i = 0; i < 520; i += 1) {
      const offset = i * 3;
      positions[offset] = (Math.random() - 0.5) * 26;
      positions[offset + 1] = (Math.random() - 0.5) * 14;
      positions[offset + 2] = (Math.random() - 0.5) * 12;
    }

    return positions;
  }, []);

  const bars = [
    { x: -5.6, y: -2.4, width: 1.25, height: 10.8, color: "#c9dfff", glow: "#5b92e9" },
    { x: -3.6, y: -1.45, width: 1.7, height: 12.2, color: "#a4c7fb", glow: "#3b79da" },
    { x: -1.1, y: -0.35, width: 2.15, height: 13.6, color: "#88b5f7", glow: "#1d68d1" },
    { x: 1.95, y: 0.85, width: 2.4, height: 14.8, color: "#6fa6f2", glow: "#0f5dc6" },
    { x: 5.4, y: 2.2, width: 2.7, height: 15.6, color: "#5e96ea", glow: "#034ea2" },
    { x: 9.1, y: 3.55, width: 2.3, height: 14.8, color: "#4f88df", glow: "#03408a" },
  ];

  return (
    <>
      <color attach="background" args={["#fdfefe"]} />
      <fog attach="fog" args={["#fdfefe", 14, 34]} />
      <ambientLight intensity={1.9} />
      <directionalLight position={[2, 4, 8]} color="#ffffff" intensity={2.2} />
      <pointLight position={[4, 3, 7]} intensity={36} color="#d9e8ff" />
      <pointLight position={[8, 2, 4]} intensity={22} color="#4d8fe7" />

      <group position={[3.1, -0.25, -1.3]} rotation={[0, 0, -0.58]}>
        {bars.map((bar) => (
          <group key={`${bar.x}-${bar.width}`} position={[bar.x, bar.y, 0]}>
            <mesh position={[0.22, 0.3, -0.45]}>
              <planeGeometry args={[bar.width * 1.35, bar.height * 1.06]} />
              <meshBasicMaterial color={bar.glow} transparent opacity={0.08} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[bar.width, bar.height]} />
              <meshPhysicalMaterial
                color={bar.color}
                emissive={bar.glow}
                emissiveIntensity={0.55}
                roughness={0.16}
                metalness={0.06}
                transmission={0.02}
                transparent
                opacity={0.98}
              />
            </mesh>
            <mesh position={[bar.width * 0.38, 0, 0.08]}>
              <planeGeometry args={[bar.width * 0.08, bar.height]} />
              <meshBasicMaterial color="#f8fbff" transparent opacity={0.9} />
            </mesh>
          </group>
        ))}
      </group>

      <mesh position={[6.2, -4.3, -4]} rotation={[-1.1, 0, -0.56]}>
        <planeGeometry args={[22, 18]} />
        <meshBasicMaterial color="#d9e7fb" transparent opacity={0.32} />
      </mesh>

      <mesh position={[6.8, -4.5, -3.4]} rotation={[-1.1, 0, -0.56]}>
        <planeGeometry args={[22.3, 18.4]} />
        <meshBasicMaterial color="#fefefe" transparent opacity={0.62} />
      </mesh>

      <points rotation={[0, 0.1, 0.06]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparklePositions, 3]}
            count={sparklePositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#8bb4ee"
          size={0.03}
          sizeAttenuation
          transparent
          opacity={0.65}
        />
      </points>
    </>
  );
}

export function RetrofuturisticBackground() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop="demand"
      camera={{ position: [0, 0, 11.5], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
    >
      <FloatingPanels />
    </Canvas>
  );
}
