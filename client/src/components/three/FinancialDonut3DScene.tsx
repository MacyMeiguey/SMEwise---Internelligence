/**
 * FinancialDonut3DScene — stunning 3D donut chart for fund allocation.
 * Replaces flat Recharts with an interactive 3D visualization.
 * Each segment is extruded, labeled, and interactive.
 */

import { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Float, Line } from '@react-three/drei';
import { Mesh, Group, Shape, ExtrudeGeometry, Vector3 } from 'three';
import { onGlCreatedAllowRecovery } from './glContextHandlers';

interface Segment {
  category: string;
  percentage: number;
  amount: number;
  color: string;
}

interface DonutSegmentProps {
  startAngle: number;
  endAngle: number;
  color: string;
  label: string;
  percentage: number;
  amount: number;
  isHovered: boolean;
  onHover: (hover: boolean) => void;
}

function DonutSegment({
  startAngle,
  endAngle,
  color,
  label,
  percentage,
  amount,
  isHovered,
  onHover,
}: DonutSegmentProps) {
  const meshRef = useRef<Mesh>(null!);
  const groupRef = useRef<Group>(null!);

  useFrame(() => {
    if (!meshRef.current) return;
    const targetScale = isHovered ? 1.08 : 1.0;
    meshRef.current.scale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.15);
  });

  // Create donut segment shape
  const shape = new Shape();
  const innerRadius = 1.0;
  const outerRadius = 1.8;
  const segments = 64;

  // Outer arc
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments);
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  // Inner arc (reverse)
  for (let i = segments; i >= 0; i--) {
    const angle = startAngle + (endAngle - startAngle) * (i / segments);
    const x = Math.cos(angle) * innerRadius;
    const y = Math.sin(angle) * innerRadius;
    shape.lineTo(x, y);
  }

  shape.closePath();

  const extrudeSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 3,
  };

  const geometry = new ExtrudeGeometry(shape, extrudeSettings);

  // Calculate label position — well outside the donut with plenty of space
  const midAngle = (startAngle + endAngle) / 2;
  const labelRadius = outerRadius + 1.4;
  const labelX = Math.cos(midAngle) * labelRadius;
  const labelY = Math.sin(midAngle) * labelRadius;

  // Leader line: from outer edge of donut to label
  const lineStartRadius = outerRadius + 0.15;
  const lineStartX = Math.cos(midAngle) * lineStartRadius;
  const lineStartY = Math.sin(midAngle) * lineStartRadius;
  const lineMidRadius = outerRadius + 0.7;
  const lineMidX = Math.cos(midAngle) * lineMidRadius;
  const lineMidY = Math.sin(midAngle) * lineMidRadius;

  const linePoints = useMemo<[number, number, number][]>(() => [
    [lineStartX, lineStartY, 0.1],
    [lineMidX, lineMidY, 0.2],
    [labelX, labelY, 0.3],
  ], [lineStartX, lineStartY, lineMidX, lineMidY, labelX, labelY]);

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, 0, -0.2]}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHovered ? 0.4 : 0.15}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Leader line from segment to label */}
      <Line
        points={linePoints}
        color={isHovered ? '#ffffff' : '#a78bfa'}
        lineWidth={isHovered ? 2 : 1}
        opacity={isHovered ? 0.9 : 0.5}
        transparent
      />

      {/* Dot at line start (on donut edge) */}
      <mesh position={[lineStartX, lineStartY, 0.1]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Label */}
      <Float speed={0.5} rotationIntensity={0} floatIntensity={0.02}>
        <group position={[labelX, labelY, 0.3]}>
          <Text
            fontSize={0.2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#000000"
          >
            {label}
          </Text>
          <Text
            fontSize={0.16}
            color="#c4b5fd"
            anchorX="center"
            anchorY="middle"
            position={[0, -0.26, 0]}
          >
            {percentage}%
          </Text>
          <Text
            fontSize={0.12}
            color="#a78bfa"
            anchorX="center"
            anchorY="middle"
            position={[0, -0.46, 0]}
          >
            RM {(amount / 1000).toFixed(0)}k
          </Text>
        </group>
      </Float>
    </group>
  );
}

function DonutChart({ segments }: { segments: Segment[] }) {
  const groupRef = useRef<Group>(null!);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // No auto-rotation — just a gentle idle tilt so it feels 3D but not dizzy
  useFrame((state) => {
    if (!groupRef.current) return;
    // Subtle breathing tilt (very slow, barely noticeable)
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.02;
    groupRef.current.rotation.y = Math.cos(t * 0.2) * 0.02;
  });

  let currentAngle = 0;

  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      {segments.map((seg, i) => {
        const startAngle = currentAngle;
        const sweepAngle = (seg.percentage / 100) * Math.PI * 2;
        const endAngle = startAngle + sweepAngle;
        currentAngle = endAngle;

        return (
          <DonutSegment
            key={i}
            startAngle={startAngle}
            endAngle={endAngle}
            color={seg.color}
            label={seg.category}
            percentage={seg.percentage}
            amount={seg.amount}
            isHovered={hoveredIndex === i}
            onHover={(hover) => setHoveredIndex(hover ? i : null)}
          />
        );
      })}

      {/* Center glow */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.08, 64]} />
        <meshStandardMaterial
          color="#7c3aed"
          emissive="#7c3aed"
          emissiveIntensity={0.6}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

interface FinancialDonut3DSceneProps {
  segments: Segment[];
}

export default function FinancialDonut3DScene({ segments }: FinancialDonut3DSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9.5], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={onGlCreatedAllowRecovery}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-3, -3, -3]} intensity={0.4} color="#c4b5fd" />
      <pointLight position={[0, 0, 4]} intensity={0.8} color="#a78bfa" distance={12} />
      <DonutChart segments={segments} />
    </Canvas>
  );
}

export type { Segment };
