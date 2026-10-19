/**
 * LandingStage3DScene — cinematic full-page 3D backdrop.
 *
 * Scroll-driven effects inspired by Huly / Adaline / Twingate:
 *   • Camera orbits azimuth as you scroll — the world visibly "turns"
 *   • Objects travel curved arcs (Y + Z + slight X drift), not plain linear Y
 *   • Four scroll scenes: each object has a spotlight "phase" where it glows +
 *     scales up, and dims when you're not in its section
 *   • Dramatic dolly-in so the scene fills more frame in lower sections
 *   • Camera / rig / rings use **linear** scroll (1:1 with the page) so orbit matches the scrollbar
 *   • Dual lavender rings counter-rotate with scroll for depth
 */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox, Sparkles } from '@react-three/drei';
import { Group, Mesh, PointLight, MathUtils, Vector3, PerspectiveCamera, type ColorRepresentation } from 'three';
import { onGlCreatedAllowRecovery } from './glContextHandlers';

/* ── Constants ─────────────────────────────────────────────────────────────── */
const LAVENDER      = '#c4b5fd';
const SCENE_PHASES  = 4;           // hero | see-it | features | cta
const PHASE_SIZE    = 1 / SCENE_PHASES;

/** Linear 0–1 — scroll maps directly to camera / rig / props (obvious orbit). */
function scrollLinear(raw: number) {
  return Math.min(1, Math.max(0, raw));
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** How "active" an object is (0-1) given its phase (0-3) and current scroll */
function phaseWeight(phase: number, scroll: number): number {
  const centre = (phase + 0.5) * PHASE_SIZE;
  const dist   = Math.abs(scroll - centre);
  // Full weight within ±0.15, fades to 0 at ±0.35
  return 1 - smoothstep(0.15, 0.35, dist);
}

/* ── Per-object float / orbit hook ────────────────────────────────────────── */
interface PlacementProps {
  scrollRef: React.MutableRefObject<number>;
  motion: boolean;
  base: [number, number, number];
  parallax?: number;
  sway?: number;
  spin?: number;
  seed?: number;
  /** 0-3 which scroll "scene" this object belongs to */
  phase?: number;
  /** Emissive glow when active */
  glowColor?: ColorRepresentation;
}

function useFloater(
  ref: React.RefObject<Group>,
  {
    scrollRef, motion, base,
    parallax = 1.4, sway = 0.12, spin = 1, seed = 0,
    phase = 0,
  }: PlacementProps,
) {
  useFrame((state) => {
    if (!ref.current) return;
    const t = motion ? state.clock.elapsedTime : 0;
    const r = scrollRef.current;
    const lin = scrollLinear(r);

    // ── Lissajous drift (more organic than pure sin) ──
    const sx = Math.sin(t * 0.32 + seed)         * sway
             + Math.cos(t * 0.19 + seed * 1.7)   * sway * 0.38;
    const sy = Math.cos(t * 0.41 + seed * 1.3)   * sway * 0.7;
    const sz = motion ? Math.sin(t * 0.24 + seed * 0.9) * 0.25 : 0;

    // ── Scroll arc: stronger Y + Z so parallax reads clearly on scroll ──
    const scrollY = lin * parallax * 2.0;
    const scrollZ = lin * parallax * 0.62;

    ref.current.position.set(
      base[0] + sx,
      base[1] + sy - scrollY,
      base[2] + sz + scrollZ,
    );

    // ── Phase scale spotlight (subtle — avoids "AI glow on everything") ──
    const w         = phaseWeight(phase, r);
    const targetSc  = motion ? 1.0 + w * 0.18 : 1.0;
    ref.current.scale.setScalar(
      MathUtils.lerp(ref.current.scale.x, targetSc, 0.045),
    );

    // ── Rotation ──
    if (motion) {
      ref.current.rotation.x += 0.0020 * spin;
      ref.current.rotation.y += 0.0032 * spin;
      ref.current.rotation.z += 0.0008 * spin;
    }
  });
}

/* ── SME objects ───────────────────────────────────────────────────────────── */

function CoinStack(props: PlacementProps) {
  const ref   = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[0, i * 0.17 - 0.34, 0]}>
          <cylinderGeometry args={[0.44, 0.44, 0.14, 48]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.22}
            emissive="#f59e0b" emissiveIntensity={0.09} />
        </mesh>
      ))}
      <mesh position={[0, 0.51, 0]}>
        <cylinderGeometry args={[0.30, 0.30, 0.016, 32]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4}
          emissive="#fde68a" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function Shopfront(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref}>
      <RoundedBox args={[1.2, 1.0, 0.6]} radius={0.06} smoothness={3}>
        <meshStandardMaterial color="#fde68a" roughness={0.5} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, -0.22, 0.31]}>
        <boxGeometry args={[0.32, 0.46, 0.02]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.4} />
      </mesh>
      {([-0.35, 0.35] as const).map((x) => (
        <mesh key={x} position={[x, 0.1, 0.31]}>
          <boxGeometry args={[0.22, 0.22, 0.02]} />
          <meshStandardMaterial color={LAVENDER} emissive={LAVENDER} emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.95, 0.44, 4]} />
        <meshStandardMaterial color="#fb7185" roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.37, 0.34]}>
        <boxGeometry args={[1.0, 0.12, 0.04]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.38} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Receipt(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref} rotation={[0.1, 0, -0.2]}>
      <mesh>
        <boxGeometry args={[0.7, 1.05, 0.02]} />
        <meshStandardMaterial color="#fafafa" roughness={0.7} metalness={0.02} />
      </mesh>
      {[0.32, 0.18, 0.04, -0.1, -0.24, -0.38].map((y) => (
        <mesh key={y} position={[0, y, 0.012]}>
          <boxGeometry args={[0.5, 0.04, 0.005]} />
          <meshStandardMaterial color="#171717" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.42, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.005, 24]} />
        <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

function Megaphone(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref} rotation={[0, 0, -0.4]}>
      <mesh position={[-0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.45, 24]} />
        <meshStandardMaterial color="#171717" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0.15, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.45, 0.85, 32, 1, true]} />
        <meshStandardMaterial color="#fb7185" roughness={0.4} metalness={0.15} side={2} />
      </mesh>
      <mesh position={[0.58, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.42, 0.04, 8, 32]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.4} metalness={0.4}
          emissive="#fb923c" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function ShoppingBag(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref}>
      <RoundedBox args={[0.85, 1.0, 0.4]} radius={0.06} smoothness={3}>
        <meshStandardMaterial color="#2dd4bf" roughness={0.5} metalness={0.15} />
      </RoundedBox>
      {([-0.25, 0.25] as const).map((x) => (
        <mesh key={x} position={[x, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.13, 0.025, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#0f766e" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.22]}>
        <boxGeometry args={[0.36, 0.22, 0.02]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    </group>
  );
}

function BarChart(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  const bars: { h: number; color: ColorRepresentation; x: number }[] = [
    { h: 0.45, color: '#a78bfa', x: -0.4 },
    { h: 0.75, color: '#14b8a6', x:  0.0 },
    { h: 1.05, color: '#34d399', x:  0.4 },
  ];
  return (
    <group ref={ref}>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.4, 0.04, 0.5]} />
        <meshStandardMaterial color="#171717" roughness={0.7} />
      </mesh>
      {bars.map(({ h, color, x }) => (
        <mesh key={x} position={[x, -0.55 + h / 2, 0]}>
          <boxGeometry args={[0.28, h, 0.28]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.14}
            roughness={0.45} metalness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Calculator(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref} rotation={[0.2, 0.3, 0.0]}>
      <RoundedBox args={[0.8, 1.0, 0.08]} radius={0.05} smoothness={3}>
        <meshStandardMaterial color="#0f0f0f" roughness={0.55} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, 0.32, 0.045]}>
        <boxGeometry args={[0.66, 0.22, 0.02]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.48} roughness={0.4} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <mesh key={i} position={[-0.22 + col * 0.22, 0.05 - row * 0.18, 0.045]}>
            <boxGeometry args={[0.16, 0.13, 0.02]} />
            <meshStandardMaterial color={i === 11 ? '#fb7185' : LAVENDER} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

function PriceTag(props: PlacementProps) {
  const ref = useRef<Group>(null!);
  useFloater(ref, props);
  return (
    <group ref={ref} rotation={[0, 0, Math.PI / 6]}>
      <mesh>
        <boxGeometry args={[0.7, 0.45, 0.05]} />
        <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.17}
          roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[-0.28, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 24]} />
        <meshStandardMaterial color="#0f0f0f" />
      </mesh>
      <mesh position={[-0.45, 0.1, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
      <mesh position={[0.08, 0, 0.03]}>
        <boxGeometry args={[0.34, 0.22, 0.02]} />
        <meshStandardMaterial color="#fff7ed" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ── Whole scene tilt with scroll (reads as 3D “orbit” without OrbitControls) ─ */
function ScrollSceneRig({
  scrollRef,
  motion,
  children,
}: {
  scrollRef: React.MutableRefObject<number>;
  motion: boolean;
  children: React.ReactNode;
}) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current) return;
    if (!motion) {
      g.current.rotation.y = 0;
      g.current.rotation.x = 0;
      return;
    }
    const lin = scrollLinear(scrollRef.current);
    const targetY = lin * Math.PI * 1.12;
    const targetX = lin * 0.4;
    g.current.rotation.y = MathUtils.lerp(g.current.rotation.y, targetY, 0.28);
    g.current.rotation.x = MathUtils.lerp(g.current.rotation.x, targetX, 0.22);
  });
  return <group ref={g}>{children}</group>;
}

/** Lavender rings — orbit visibly with scroll (dual rings, counter-rotating for depth). */
function ScrollDepthRings({
  scrollRef,
  motion,
}: {
  scrollRef: React.MutableRefObject<number>;
  motion: boolean;
}) {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  useFrame(() => {
    if (!motion) return;
    const lin = scrollLinear(scrollRef.current);
    if (outer.current) {
      outer.current.rotation.z = lin * Math.PI * 1.55;
      outer.current.rotation.y = lin * Math.PI * 0.38;
    }
    if (inner.current) {
      inner.current.rotation.z = -lin * Math.PI * 1.28;
      inner.current.rotation.x = lin * 0.26;
    }
  });
  return (
    <group position={[0, -1.1, -3.8]}>
      <mesh ref={outer} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.55, 0.045, 12, 104]} />
        <meshStandardMaterial
          color={LAVENDER}
          emissive={LAVENDER}
          emissiveIntensity={0.55}
          metalness={0.38}
          roughness={0.38}
          transparent
          opacity={0.48}
        />
      </mesh>
      <mesh ref={inner} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.15, 0.026, 10, 80]} />
        <meshStandardMaterial
          color="#e9d5ff"
          emissive="#e9d5ff"
          emissiveIntensity={0.38}
          metalness={0.42}
          roughness={0.45}
          transparent
          opacity={0.38}
        />
      </mesh>
    </group>
  );
}

/** Lavender accent that travels with scroll — makes lighting change obvious */
function ScrollPointLight({
  scrollRef,
  motion,
}: {
  scrollRef: React.MutableRefObject<number>;
  motion: boolean;
}) {
  const ref = useRef<PointLight>(null);
  useFrame(() => {
    if (!ref.current || !motion) return;
    const lin = scrollLinear(scrollRef.current);
    ref.current.position.set(-3 + lin * 14, 4 - lin * 8, 1.0 + lin * 5.5);
    ref.current.intensity = 0.48 + lin * 1.45;
  });
  return <pointLight ref={ref} color="#d8b4fe" distance={24} decay={2} />;
}

/* ── Cinematic scroll camera (scroll-driven path — not user orbit drag) ───── */
const _camTarget = new Vector3();

function ScrollCamera({
  scrollRef,
  motion,
}: {
  scrollRef: React.MutableRefObject<number>;
  motion: boolean;
}) {
  useFrame((state) => {
    if (!motion) return;
    const elapsed = state.clock.elapsedTime;
    const raw = scrollRef.current;
    const scroll = scrollLinear(raw);

    // Wide azimuth — tied linearly to page scroll so orbit matches scrollbar 1:1
    const azimuth = scroll * Math.PI * 1.08;
    const radius  = 8.55 - scroll * 3.85;

    const driftX  = Math.sin(elapsed * 0.07) * 0.06;
    const driftY  = Math.cos(elapsed * 0.055) * 0.05;

    const targetX = Math.sin(azimuth) * radius + driftX;
    const targetY = -scroll * 2.35 + driftY;
    const targetZ = Math.cos(azimuth) * radius;

    const follow = 0.34;
    state.camera.position.x = MathUtils.lerp(state.camera.position.x, targetX, follow);
    state.camera.position.y = MathUtils.lerp(state.camera.position.y, targetY, follow);
    state.camera.position.z = MathUtils.lerp(state.camera.position.z, targetZ, follow);

    const cam = state.camera as PerspectiveCamera;
    const targetFov = 54 - scroll * 22;
    cam.fov = MathUtils.lerp(cam.fov, targetFov, 0.16);
    cam.updateProjectionMatrix();

    _camTarget.set(
      Math.sin(-azimuth * 0.62) * 1.15,
      -scroll * 1.35,
      Math.cos(azimuth * 0.44) * 0.52,
    );
    state.camera.lookAt(_camTarget);
  });
  return null;
}

/* ── Scene root ────────────────────────────────────────────────────────────── */
interface LandingStage3DSceneProps {
  scrollRef: React.MutableRefObject<number>;
  motion?: boolean;
}

export default function LandingStage3DScene({ scrollRef, motion = true }: LandingStage3DSceneProps) {
  const objects = useMemo(() => [
    // ── Scene 0 — Hero ────────────────────────────────────────────────────
    { Comp: Shopfront,   base: [ 2.5,  0.8, -0.4] as [number,number,number], parallax: 2.4, sway: 0.18, spin: 0.5, seed: 1.0, phase: 0 },
    { Comp: CoinStack,   base: [-3.1,  0.3,  0.5] as [number,number,number], parallax: 2.0, sway: 0.16, spin: 0.7, seed: 2.3, phase: 0 },

    // ── Scene 1 — See it / Advisor ────────────────────────────────────────
    { Comp: ShoppingBag, base: [-1.7,  1.6, -0.2] as [number,number,number], parallax: 2.8, sway: 0.14, spin: 0.6, seed: 3.6, phase: 1 },
    { Comp: Calculator,  base: [ 3.5,  1.5,  0.3] as [number,number,number], parallax: 3.2, sway: 0.14, spin: 0.5, seed: 4.4, phase: 1 },

    // ── Scene 2 — Features ────────────────────────────────────────────────
    { Comp: Receipt,     base: [-3.3, -1.6,  0.4] as [number,number,number], parallax: 3.8, sway: 0.18, spin: 0.4, seed: 5.0, phase: 2 },
    { Comp: Megaphone,   base: [ 2.7, -1.8,  0.6] as [number,number,number], parallax: 3.4, sway: 0.18, spin: 0.6, seed: 6.2, phase: 2 },

    // ── Scene 3 — CTA ─────────────────────────────────────────────────────
    { Comp: BarChart,    base: [-2.5, -3.6, -0.3] as [number,number,number], parallax: 4.2, sway: 0.16, spin: 0.5, seed: 7.1, phase: 3 },
    { Comp: PriceTag,    base: [ 3.1, -3.4,  0.4] as [number,number,number], parallax: 4.6, sway: 0.18, spin: 0.7, seed: 8.4, phase: 3 },
  ], []);

  return (
    <Canvas
      camera={{ position: [0, 0, 7.2], fov: 44 }}
      dpr={[1, 1.35]}
      gl={{
        antialias: true,
        alpha: true,
        /* "default" is often more stable on hybrid GPUs than forcing discrete */
        powerPreference: 'default',
        stencil: false,
      }}
      onCreated={onGlCreatedAllowRecovery}
      style={{ width: '100%', height: '100%' }}
      frameloop={motion ? 'always' : 'demand'}
    >
      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 5]}   intensity={1.10} />
      <directionalLight position={[-5, -2, -3]} intensity={0.50} color={LAVENDER} />
      <directionalLight position={[0, -8, 4]}   intensity={0.40} color="#fb7185" />

      <ScrollCamera scrollRef={scrollRef} motion={motion} />

      <ScrollSceneRig scrollRef={scrollRef} motion={motion}>
        <ScrollDepthRings scrollRef={scrollRef} motion={motion} />
        <ScrollPointLight scrollRef={scrollRef} motion={motion} />

      {objects.map(({ Comp, base, parallax, sway, spin, seed, phase }, i) => (
        <Float
          key={i}
          speed={motion ? 0.35 : 0}
          rotationIntensity={motion ? 0.05 : 0}
          floatIntensity={motion ? 0.07 : 0}
        >
          <Comp
            scrollRef={scrollRef}
            motion={motion}
            base={base}
            parallax={parallax}
            sway={sway}
            spin={spin}
            seed={seed}
            phase={phase}
          />
        </Float>
      ))}

      {motion && (
        <>
          <Sparkles
            count={70}
            scale={[18, 10, 8]}
            size={2.35}
            color={LAVENDER}
            speed={0.58}
            opacity={0.62}
          />
          <Sparkles
            count={28}
            scale={[14, 6, 6]}
            position={[0, -4, 0]}
            size={1.85}
            color="#fb7185"
            speed={0.42}
            opacity={0.44}
          />
        </>
      )}
      </ScrollSceneRig>
    </Canvas>
  );
}
