
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, MeshTransmissionMaterial } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function AbstractShape() {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      mesh.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={mesh} scale={2.5}>
        <torusKnotGeometry args={[1, 0.3, 64, 16]} />
        {/* This creates a glass-like 3D material */}
        <MeshTransmissionMaterial 
          backside 
          resolution={256}
          thickness={0.5} 
          roughness={0.1} 
          transmission={1} 
          ior={1.5} 
          chromaticAberration={0.05} 
          color="#1a1a1a"
        />
      </mesh>
    </Float>
  );
}

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 h-screen w-full opacity-60 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <AbstractShape />
      </Canvas>
    </div>
  );
}
