/**
 * ChatAvatar3DScene — friendly SME-owner mascot for the advisor panel.
 *
 * Built procedurally (no GLB asset) so the bundle stays small and the look
 * is fully brand-controlled.
 *
 * Animations:
 *   • Idle — gentle bob + random blink + slow head sway
 *   • Speaking (isTyping) — mouth bounces, halo rotates faster + pulses,
 *                            status pip turns green
 *   • Nod-on-send — when the parent increments `nodSignal`, the head
 *                    performs one quick nod (acknowledging the user)
 */

import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Group, Mesh, MathUtils } from 'three';

const SKIN = '#fcd9b8';     // warm tan — reads as person, not robot
const SKIN_SHADE = '#f0bfa6';
const HAIR = '#1f1330';     // near-black with violet hint
const SHIRT = '#7c3aed';    // brand primary-600
const SHIRT_DARK = '#5b21b6';
const GLASSES = '#0f0f0f';
const LENS = '#1f1330';
const HALO = '#c4b5fd';
const CHEEK = '#f4a8a0';

function AvatarFigure({ speaking, nodSignal }: { speaking: boolean; nodSignal: number }) {
  const rootRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const haloRef = useRef<Mesh>(null);
  const leftEyeRef = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);
  const mouthRef = useRef<Mesh>(null);
  const blinkRef = useRef<{ next: number; t: number }>({ next: 2.5, t: 0 });
  const nodStartedAt = useRef<number | null>(null);

  // Trigger nod when nodSignal changes
  useEffect(() => {
    nodStartedAt.current = performance.now();
  }, [nodSignal]);

  useFrame((state, dt) => {
    const t = state.clock.getElapsedTime();

    // Root: gentle bob
    if (rootRef.current) {
      rootRef.current.position.y = Math.sin(t * 1.6) * 0.04;
      rootRef.current.rotation.z = Math.sin(t * 1.1) * 0.03;
    }

    // Head: ambient sway + speak tilt + nod animation
    if (headRef.current) {
      let nodAngle = 0;
      if (nodStartedAt.current !== null) {
        const elapsed = (performance.now() - nodStartedAt.current) / 1000;
        const DURATION = 0.7;
        if (elapsed < DURATION) {
          // Two quick down-up arcs over 0.7s
          nodAngle = Math.sin((elapsed / DURATION) * Math.PI * 2) * 0.28;
        } else {
          nodStartedAt.current = null;
        }
      }

      const ambientY = speaking ? Math.sin(t * 6) * 0.05 : Math.sin(t * 0.8) * 0.05;
      const ambientX = speaking ? Math.sin(t * 8) * 0.04 : 0;

      headRef.current.rotation.x = MathUtils.lerp(
        headRef.current.rotation.x,
        nodAngle + ambientX,
        0.25,
      );
      headRef.current.rotation.y = MathUtils.lerp(headRef.current.rotation.y, ambientY, 0.1);
    }

    // Halo
    if (haloRef.current) {
      haloRef.current.rotation.z += dt * (speaking ? 1.6 : 0.4);
      const scale = speaking ? 1 + Math.sin(t * 8) * 0.04 : 1;
      haloRef.current.scale.setScalar(scale);
    }

    // Mouth: smile bar gets taller when speaking
    if (mouthRef.current) {
      const targetY = speaking ? 0.35 + Math.abs(Math.sin(t * 14)) * 0.3 : 0.22;
      mouthRef.current.scale.y = MathUtils.lerp(mouthRef.current.scale.y, targetY, 0.25);
    }

    // Eye blink
    blinkRef.current.t += dt;
    let blinkScale = 1;
    if (blinkRef.current.t > blinkRef.current.next) {
      const within = blinkRef.current.t - blinkRef.current.next;
      if (within < 0.14) blinkScale = 1 - within / 0.14;
      else if (within < 0.28) blinkScale = (within - 0.14) / 0.14;
      else {
        blinkRef.current.t = 0;
        blinkRef.current.next = 2 + Math.random() * 3;
      }
    }
    if (leftEyeRef.current)
      leftEyeRef.current.scale.y = MathUtils.lerp(leftEyeRef.current.scale.y, blinkScale, 0.5);
    if (rightEyeRef.current)
      rightEyeRef.current.scale.y = MathUtils.lerp(rightEyeRef.current.scale.y, blinkScale, 0.5);
  });

  return (
    <group ref={rootRef}>
      {/* Halo behind head */}
      <mesh ref={haloRef} position={[0, 0.15, -0.55]}>
        <torusGeometry args={[1.1, 0.04, 14, 64]} />
        <meshStandardMaterial color={HALO} emissive={HALO} emissiveIntensity={0.55} />
      </mesh>

      {/* Shoulders / shirt (under the head) */}
      <group position={[0, -1.05, 0]}>
        <mesh>
          <sphereGeometry args={[1.0, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={SHIRT} metalness={0.1} roughness={0.7} />
        </mesh>
        {/* Collar V */}
        <mesh position={[0, 0.18, 0.55]} rotation={[0.4, 0, 0]}>
          <coneGeometry args={[0.25, 0.4, 4]} />
          <meshStandardMaterial color={SHIRT_DARK} />
        </mesh>
        {/* Neck */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.3, 24]} />
          <meshStandardMaterial color={SKIN_SHADE} />
        </mesh>
      </group>

      {/* HEAD */}
      <group ref={headRef}>
        {/* Round face */}
        <mesh>
          <sphereGeometry args={[0.78, 48, 48]} />
          <meshStandardMaterial color={SKIN} metalness={0.05} roughness={0.5} />
        </mesh>

        {/* Hair — slightly larger partial sphere capping the top */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.81, 48, 48, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color={HAIR} metalness={0.2} roughness={0.6} />
        </mesh>
        {/* Hair sweep accent */}
        <mesh position={[0.35, 0.32, 0.5]} rotation={[0.2, 0.4, -0.3]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial color={HAIR} metalness={0.2} roughness={0.6} />
        </mesh>

        {/* GLASSES */}
        {/* Left lens */}
        <mesh position={[-0.26, 0.04, 0.65]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.15, 0.025, 12, 32]} />
          <meshStandardMaterial color={GLASSES} metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[-0.26, 0.04, 0.64]}>
          <circleGeometry args={[0.13, 32]} />
          <meshStandardMaterial color={LENS} transparent opacity={0.18} />
        </mesh>
        {/* Right lens */}
        <mesh position={[0.26, 0.04, 0.65]}>
          <torusGeometry args={[0.15, 0.025, 12, 32]} />
          <meshStandardMaterial color={GLASSES} metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0.26, 0.04, 0.64]}>
          <circleGeometry args={[0.13, 32]} />
          <meshStandardMaterial color={LENS} transparent opacity={0.18} />
        </mesh>
        {/* Bridge */}
        <mesh position={[0, 0.04, 0.66]}>
          <boxGeometry args={[0.18, 0.018, 0.02]} />
          <meshStandardMaterial color={GLASSES} metalness={0.4} roughness={0.3} />
        </mesh>
        {/* Arms (sides) */}
        <mesh position={[-0.55, 0.06, 0.4]} rotation={[0, 0.4, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.02]} />
          <meshStandardMaterial color={GLASSES} metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0.55, 0.06, 0.4]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.3, 0.02, 0.02]} />
          <meshStandardMaterial color={GLASSES} metalness={0.4} roughness={0.3} />
        </mesh>

        {/* Eyes inside the lenses */}
        <mesh ref={leftEyeRef} position={[-0.26, 0.04, 0.72]}>
          <sphereGeometry args={[0.05, 20, 20]} />
          <meshStandardMaterial color="#0f0f0f" />
        </mesh>
        <mesh ref={rightEyeRef} position={[0.26, 0.04, 0.72]}>
          <sphereGeometry args={[0.05, 20, 20]} />
          <meshStandardMaterial color="#0f0f0f" />
        </mesh>

        {/* Eyebrows */}
        <mesh position={[-0.26, 0.22, 0.7]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.18, 0.03, 0.02]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        <mesh position={[0.26, 0.22, 0.7]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.18, 0.03, 0.02]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>

        {/* Cheeks */}
        <mesh position={[-0.42, -0.12, 0.6]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={CHEEK} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.42, -0.12, 0.6]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={CHEEK} transparent opacity={0.6} />
        </mesh>

        {/* Smile / mouth — scales Y when speaking */}
        <mesh ref={mouthRef} position={[0, -0.28, 0.66]}>
          <boxGeometry args={[0.32, 1, 0.04]} />
          <meshStandardMaterial color="#3b1f1a" />
        </mesh>

        {/* Tiny nose hint */}
        <mesh position={[0, -0.04, 0.78]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={SKIN_SHADE} />
        </mesh>
      </group>

      {/* Status pip top-right of head */}
      <mesh position={[0.7, 0.7, 0.4]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={speaking ? '#22c55e' : HALO}
          emissive={speaking ? '#22c55e' : HALO}
          emissiveIntensity={speaking ? 0.8 : 0.25}
        />
      </mesh>
    </group>
  );
}

interface ChatAvatar3DSceneProps {
  speaking: boolean;
  nodSignal?: number;
}

export default function ChatAvatar3DScene({ speaking, nodSignal = 0 }: ChatAvatar3DSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.05, 3.2], fov: 35 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 2, 3]} intensity={1.05} />
      <directionalLight position={[-2, -1, -1]} intensity={0.45} color={HALO} />
      <AvatarFigure speaking={speaking} nodSignal={nodSignal} />
    </Canvas>
  );
}
