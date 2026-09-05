import { ContactShadows, Environment, Grid, OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { ALL_HOLES, holePosition } from "@/circuit/breadboard";
import { useLab } from "@/store/lab";
import {
  BreadboardBody,
  JumperWire,
  PartSwitch,
  PowerSupply,
} from "./parts-3d";

function HoverMarker() {
  const hover = useLab((s) => s.hoverHole);
  const pending = useLab((s) => s.pendingHole);
  const probe = useLab((s) => s.probeHole);
  const items = [hover, pending, probe].filter(Boolean) as string[];
  return (
    <>
      {items.map((id, i) => {
        const [x, y, z] = holePosition(id);
        const color = id === pending ? "#0f766e" : id === probe ? "#eab308" : "#38bdf8";
        return (
          <mesh key={id + i} position={[x, y + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.045, 0.07, 20]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
        );
      })}
    </>
  );
}

function PreviewWire() {
  const pending = useLab((s) => s.pendingHole);
  const hover = useLab((s) => s.hoverHole);
  const tool = useLab((s) => s.tool);
  const color = useLab((s) => s.wireColor);
  if (tool !== "wire" || !pending || !hover || pending === hover) return null;
  const a = holePosition(pending);
  const b = holePosition(hover);
  const dist = Math.hypot(a[0] - b[0], a[2] - b[2]);
  const mid = new THREE.Vector3((a[0] + b[0]) / 2, a[1] + 0.2 + dist * 0.2, (a[2] + b[2]) / 2);
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...a),
    mid,
    new THREE.Vector3(...b),
  );
  const geom = new THREE.TubeGeometry(curve, 16, 0.022, 6, false);
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial color={color === "black" ? "#111" : "#c2413b"} transparent opacity={0.45} />
    </mesh>
  );
}


function PowerClipMarkers() {
  const pos = useLab((s) => s.psuPositive);
  const neg = useLab((s) => s.psuNegative);
  return (
    <>
      {pos ? <ClipMarker id={pos} color="#ef4444" /> : null}
      {neg ? <ClipMarker id={neg} color="#e5e7eb" /> : null}
    </>
  );
}

function ClipMarker({ id, color }: { id: string; color: string }) {
  const [x, y, z] = holePosition(id);
  return (
    <group position={[x, y + 0.08, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.095, 20]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  useMemo(() => {
    camera.position.set(3.8, 4.4, 5.6);
  }, [camera]);
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.15}
      minDistance={3.2}
      maxDistance={16}
      target={[0, 0.2, 0]}
    />
  );
}

export function LabScene() {
  const parts = useLab((s) => s.parts);
  const wires = useLab((s) => s.wires);
  const selectedId = useLab((s) => s.selectedId);
  const sim = useLab((s) => s.sim);
  const select = useLab((s) => s.select);

  return (
    <>
      <color attach="background" args={["#0a1018"]} />
      <fog attach="fog" args={["#0a1018", 14, 30]} />

      {/* Soft environment reflections for more realistic plastics/metal */}
      <Environment preset="warehouse" environmentIntensity={0.42} />

      <hemisphereLight args={["#a8c0d8", "#1a1f28", 0.5]} />
      <ambientLight intensity={0.36} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={24}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 6, -3]} intensity={0.28} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
        onPointerDown={() => select(null)}
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0c121c" />
      </mesh>
      <Grid
        position={[0, 0.001, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1a2436"
        sectionSize={2}
        sectionThickness={1.1}
        sectionColor="#243044"
        fadeDistance={22}
        fadeStrength={1.4}
        infiniteGrid
      />

      <BreadboardBody />
      <PowerSupply />
      <PowerClipMarkers />
      {wires.map((w) => (
        <JumperWire key={w.id} wire={w} selected={selectedId === w.id} />
      ))}
      {parts.map((p) => (
        <PartSwitch key={p.id} part={p} selected={selectedId === p.id} sim={sim} />
      ))}
      <HoverMarker />
      <PreviewWire />
      <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={18} blur={2.4} far={3.2} />
      <CameraRig />
      <group visible={false}>
        {ALL_HOLES.slice(0, 1).map((id) => (
          <mesh key={id} />
        ))}
      </group>
    </>
  );
}
