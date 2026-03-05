"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { AgentCommModel, CommMessageType } from "@/lib/openclaw-types";
import type { EmployeeData } from "@/lib/types";

const COMM_COLORS: Record<CommMessageType, string> = {
  delegation: "#3b82f6",   // blue
  status_update: "#22c55e", // green
  escalation: "#ef4444",   // red
  query: "#a855f7",        // purple
};

interface CommBeamProps {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  label: string;
}

function CommBeam({ from, to, color, label }: CommBeamProps) {
  const groupRef = useRef<THREE.Group>(null);
  const particleRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(0);

  // Animate particle along the beam
  useFrame((_, delta) => {
    progressRef.current = (progressRef.current + delta * 0.5) % 1;
    if (particleRef.current) {
      const t = progressRef.current;
      particleRef.current.position.set(
        from[0] + (to[0] - from[0]) * t,
        from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.3,
        from[2] + (to[2] - from[2]) * t,
      );
    }
  });

  // Create arc points for a curved beam
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.5;
      const z = from[2] + (to[2] - from[2]) * t;
      pts.push([x, y, z]);
    }
    return pts;
  }, [from, to]);

  const midPoint: [number, number, number] = [
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + 0.8,
    (from[2] + to[2]) / 2,
  ];

  return (
    <group ref={groupRef}>
      {/* Beam line */}
      <Line
        points={points}
        color={color}
        lineWidth={1.5}
        transparent
        opacity={0.4}
      />
      {/* Animated particle */}
      <mesh ref={particleRef} position={from}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      {/* Label at midpoint */}
      <Html position={midPoint} center distanceFactor={15} zIndexRange={[0, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            background: "rgba(0,0,0,0.7)",
            color,
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "8px",
            whiteSpace: "nowrap",
            border: `1px solid ${color}40`,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

interface CommBeamsProps {
  employees: EmployeeData[];
}

export function CommBeams({ employees }: CommBeamsProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [comms, setComms] = useState<AgentCommModel[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setComms(await adapter.getAgentComms());
    } catch { /* ignore */ }
  }, [adapter]);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => void load(), 15_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  // Build employee position lookup
  const positionByAgentId = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const emp of employees) {
      const agentId = emp._id.replace("employee-", "");
      map.set(agentId, [emp.initialPosition[0], 0.6, emp.initialPosition[2]]);
    }
    return map;
  }, [employees]);

  // Only show comms where both agents exist in the scene
  const activeBeams = useMemo(() => {
    return comms
      .filter((c) => positionByAgentId.has(c.fromAgentId) && positionByAgentId.has(c.toAgentId))
      .slice(0, 10) // Limit for performance
      .map((c) => ({
        id: c.id,
        from: positionByAgentId.get(c.fromAgentId)!,
        to: positionByAgentId.get(c.toAgentId)!,
        color: COMM_COLORS[c.messageType] ?? COMM_COLORS.status_update,
        label: `${c.fromAgentId} → ${c.toAgentId}`,
      }));
  }, [comms, positionByAgentId]);

  if (activeBeams.length === 0) return null;

  return (
    <group>
      {activeBeams.map((beam) => (
        <CommBeam key={beam.id} from={beam.from} to={beam.to} color={beam.color} label={beam.label} />
      ))}
    </group>
  );
}
