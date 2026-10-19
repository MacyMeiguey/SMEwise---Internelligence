/**
 * DashboardOrb3DScene — ambient 3D orb for section headers.
 * Each section gets a unique object that slowly rotates and pulses.
 * Built procedurally — no GLB assets needed.
 */

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Float, RoundedBox } from '@react-three/drei';
import { Mesh, Group } from 'three';
import { onGlCreatedAllowRecovery } from './glContextHandlers';

/* ── Operations: rotating building + checklist ─────────────────────────── */
function OpsOrb() {
  const g = useRef<Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.rotation.y = t * 0.4;
    g.current.rotation.x = Math.sin(t * 0.3) * 0.15;
  });
  return (
    <group ref={g}>
      {/* Main building block */}
      <RoundedBox args={[1.0, 1.4, 0.6]} radius={0.06} smoothness={3} position={[0, 0, 0]}>
        <meshStandardMaterial color="#7c3aed" metalness={0.3} roughness={0.4} emissive="#4c1d95" emissiveIntensity={0.3}/>
      </RoundedBox>
      {/* Windows */}
      {[[-0.25,0.3],[-0.25,0],[0.25,0.3],[0.25,0]].map(([x,y],i)=>(
        <mesh key={i} position={[x,y,0.32]}>
          <boxGeometry args={[0.18,0.18,0.02]}/>
          <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.8}/>
        </mesh>
      ))}
      {/* Roof */}
      <mesh position={[0,0.85,0]} rotation={[0,Math.PI/4,0]}>
        <coneGeometry args={[0.8,0.5,4]}/>
        <meshStandardMaterial color="#a78bfa" metalness={0.4} roughness={0.3}/>
      </mesh>
      {/* Orbit ring */}
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.4,0.025,8,64]}/>
        <meshStandardMaterial color="#c4b5fd" emissive="#c4b5fd" emissiveIntensity={0.5} transparent opacity={0.6}/>
      </mesh>
    </group>
  );
}

/* ── Financial: coin stack + bar chart ─────────────────────────────────── */
function FinanceOrb() {
  const g = useRef<Group>(null!);
  const bars = useRef<Mesh[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.rotation.y = t * 0.35;
    bars.current.forEach((b, i) => {
      if (b) b.scale.y = 1 + Math.sin(t * 1.5 + i * 0.8) * 0.15;
    });
  });
  const barData = [[-0.5,0.3,"#a78bfa"],[-0.15,0.5,"#fbbf24"],[0.2,0.7,"#34d399"],[0.55,0.55,"#a78bfa"]];
  return (
    <group ref={g}>
      {barData.map(([x,h,c],i)=>(
        <mesh key={i} ref={el=>{ if(el) bars.current[i]=el; }} position={[Number(x),Number(h)/2-0.5,0]}>
          <boxGeometry args={[0.22,Number(h),0.22]}/>
          <meshStandardMaterial color={c as string} emissive={c as string} emissiveIntensity={0.2} metalness={0.3} roughness={0.4}/>
        </mesh>
      ))}
      {/* Base plate */}
      <mesh position={[0,-0.52,0]}>
        <boxGeometry args={[1.4,0.06,0.5]}/>
        <meshStandardMaterial color="#1e1040" metalness={0.5} roughness={0.3}/>
      </mesh>
      {/* Coin */}
      <mesh position={[0,0.7,0]} rotation={[Math.PI/2,0,0]}>
        <cylinderGeometry args={[0.3,0.3,0.08,32]}/>
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} emissive="#f59e0b" emissiveIntensity={0.3}/>
      </mesh>
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.3,0.025,8,64]}/>
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

/* ── Pricing: price tag + dial ─────────────────────────────────────────── */
function PricingOrb() {
  const g = useRef<Group>(null!);
  const needle = useRef<Mesh>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.rotation.y = t * 0.45;
    if (needle.current) needle.current.rotation.z = Math.sin(t * 0.8) * 0.4 - 0.2;
  });
  return (
    <group ref={g}>
      {/* Tag body */}
      <RoundedBox args={[1.2,0.8,0.15]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color="#ec4899" metalness={0.2} roughness={0.4} emissive="#9d174d" emissiveIntensity={0.25}/>
      </RoundedBox>
      {/* Hole */}
      <mesh position={[-0.45,0,0.08]}>
        <cylinderGeometry args={[0.08,0.08,0.2,24]}/>
        <meshStandardMaterial color="#0f0f0f"/>
      </mesh>
      {/* RM text plane */}
      <mesh position={[0.1,0,0.09]}>
        <boxGeometry args={[0.5,0.3,0.02]}/>
        <meshStandardMaterial color="#fff7ed" roughness={0.7}/>
      </mesh>
      {/* Gauge */}
      <mesh position={[0,-1.0,0]}>
        <torusGeometry args={[0.5,0.06,8,32,Math.PI]}/>
        <meshStandardMaterial color="#1e1040" metalness={0.4} roughness={0.3}/>
      </mesh>
      <mesh ref={needle} position={[0,-1.0,0]}>
        <boxGeometry args={[0.04,0.45,0.04]}/>
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.6}/>
      </mesh>
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.3,0.025,8,64]}/>
        <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.4} transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

/* ── Marketing: megaphone + signal waves ───────────────────────────────── */
function MarketingOrb() {
  const g = useRef<Group>(null!);
  const rings = useRef<Mesh[]>([]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.rotation.y = t * 0.4;
    rings.current.forEach((r, i) => {
      if (r) {
        r.scale.setScalar(1 + ((t * 0.5 + i * 0.4) % 1) * 0.8);
        r.material && ((r.material as { opacity: number }).opacity = 0.6 - ((t * 0.5 + i * 0.4) % 1) * 0.6);
      }
    });
  });
  return (
    <group ref={g}>
      {/* Megaphone handle */}
      <mesh position={[-0.5,0,0]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[0.1,0.1,0.5,24]}/>
        <meshStandardMaterial color="#171717" metalness={0.5} roughness={0.3}/>
      </mesh>
      {/* Cone */}
      <mesh position={[0.2,0,0]} rotation={[0,0,-Math.PI/2]}>
        <coneGeometry args={[0.55,1.0,32,1,true]}/>
        <meshStandardMaterial color="#fb7185" metalness={0.2} roughness={0.4} side={2}/>
      </mesh>
      {/* Signal rings */}
      {[0,1,2].map(i=>(
        <mesh key={i} ref={el=>{ if(el) rings.current[i]=el; }} position={[0.75,0,0]} rotation={[0,Math.PI/2,0]}>
          <torusGeometry args={[0.3+i*0.2,0.02,8,32]}/>
          <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.5} transparent opacity={0.5}/>
        </mesh>
      ))}
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.3,0.025,8,64]}/>
        <meshStandardMaterial color="#14b8a6" emissive="#14b8a6" emissiveIntensity={0.4} transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

/* ── Owner Tools: document stack + sparkline ───────────────────────────── */
function OwnerOrb() {
  const g = useRef<Group>(null!);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    g.current.rotation.y = t * 0.38;
    g.current.rotation.x = Math.sin(t * 0.25) * 0.1;
  });
  return (
    <group ref={g}>
      {/* Doc stack */}
      {[0,1,2].map(i=>(
        <mesh key={i} position={[i*0.06-0.06, i*0.06-0.06, i*0.04-0.04]}>
          <boxGeometry args={[0.9,1.1,0.06]}/>
          <meshStandardMaterial color={i===2?"#ffffff":"#e5e5e5"} roughness={0.7} metalness={0.05} emissive={i===2?"#c4b5fd":"#a78bfa"} emissiveIntensity={i===2?0.15:0.05}/>
        </mesh>
      ))}
      {/* Lines on top doc */}
      {[0.3,0.1,-0.1,-0.3].map((y,i)=>(
        <mesh key={i} position={[0,y,0.07]}>
          <boxGeometry args={[0.6,0.04,0.01]}/>
          <meshStandardMaterial color="#7c3aed" roughness={0.8}/>
        </mesh>
      ))}
      {/* Mini chart */}
      <mesh position={[0.7,0.4,0.1]}>
        <boxGeometry args={[0.5,0.5,0.06]}/>
        <meshStandardMaterial color="#1e1040" metalness={0.4} roughness={0.3}/>
      </mesh>
      <mesh rotation={[Math.PI/2,0,0]}>
        <torusGeometry args={[1.3,0.025,8,64]}/>
        <meshStandardMaterial color="#c4b5fd" emissive="#c4b5fd" emissiveIntensity={0.4} transparent opacity={0.5}/>
      </mesh>
    </group>
  );
}

/* ── Scene wrapper ─────────────────────────────────────────────────────── */
const SECTION_ORBS: Record<string, () => JSX.Element> = {
  Operations: OpsOrb,
  'Financial Planning': FinanceOrb,
  'Pricing Strategy': PricingOrb,
  Marketing: MarketingOrb,
  'Owner Tools': OwnerOrb,
};

interface DashboardOrb3DSceneProps {
  section: string;
}

export default function DashboardOrb3DScene({ section }: DashboardOrb3DSceneProps) {
  const OrbComp = SECTION_ORBS[section] ?? OpsOrb;
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 38 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'default', stencil: false }}
      onCreated={onGlCreatedAllowRecovery}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6}/>
      <directionalLight position={[3, 4, 5]} intensity={1.2}/>
      <directionalLight position={[-3, -2, -2]} intensity={0.5} color="#c4b5fd"/>
      <pointLight position={[0, 2, 3]} intensity={0.8} color="#a78bfa" distance={10}/>
      <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.15}>
        <OrbComp/>
      </Float>
      <Sparkles count={30} scale={[5,5,5]} size={1.8} color="#c4b5fd" speed={0.4} opacity={0.5}/>
    </Canvas>
  );
}
