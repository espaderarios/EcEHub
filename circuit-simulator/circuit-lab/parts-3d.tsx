import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Html } from "@react-three/drei";

import { useFrame } from "@react-three/fiber";


import * as THREE from "three";

import {
  ALL_HOLES,
  holePosition,
} from "@/circuit/breadboard";

import {
  LED_HEX,
  WIRE_HEX,
  type HoleId,
  type PlacedPart,
  type SimResult,
  type Wire,
} from "@/circuit/types";

import { useLab } from "@/store/lab";


function vec(id: HoleId) {
  const [x, y, z] = holePosition(id);
  return new THREE.Vector3(x, y, z);
}

function TubeWire({
  a,
  b,
  color,
  lift = 1,
  radius = 0.028,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  color: string;
  lift?: number;
  radius?: number;
}) {
  const geom = useMemo(() => {
    const dist = a.distanceTo(b);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 0.16 + dist * 0.2 * lift;
    const curve = new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
    return new THREE.TubeGeometry(curve, 24, radius, 8, false);
  }, [a.x, a.y, a.z, b.x, b.y, b.z, lift, radius]);

  useEffect(() => () => geom.dispose(), [geom]);

  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial color={color} roughness={0.38} metalness={0.12} />
    </mesh>
  );
}

function CurrentFlow({
  a,
  b,
  active,
  color,
  strength = 1,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  active: boolean;
  color: string;
  strength?: number;
}) {
  const particles = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const tangent = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const flow = useRef(0);
  const particleCount = 7;

  const curve = useMemo(() => {
    const mid = a
      .clone()
      .lerp(b, 0.5);

    const distance =
      a.distanceTo(b);

    mid.y +=
      0.16 +
      distance * 0.2;

    return new THREE.QuadraticBezierCurve3(
      a.clone(),
      mid,
      b.clone(),
    );
  }, [
    a.x,
    a.y,
    a.z,
    b.x,
    b.y,
    b.z,
  ]);

  useFrame(({ clock }, delta) => {
    const mesh = particles.current;
    if (!mesh) return;

    // Damping lets the current settle in and out instead of popping on a
    // frame when the circuit state changes.
    flow.current = THREE.MathUtils.damp(
      flow.current,
      active ? strength : 0,
      9,
      delta,
    );

    if (flow.current < 0.015) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    const time = clock.getElapsedTime() * (0.45 + flow.current * 1.35);

    for (let index = 0; index < particleCount; index += 1) {
      const t = (time + index / particleCount) % 1;
      const edgeFade = Math.sin(Math.PI * t);
      const pulse = 0.82 + Math.sin(time * 7 + index * 1.7) * 0.18;
      const size = (0.45 + flow.current * 0.7) * pulse * edgeFade;

      curve.getPointAt(t, point);
      curve.getTangentAt(t, tangent);
      dummy.position.copy(point);
      dummy.quaternion.setFromUnitVectors(up, tangent);
      dummy.scale.set(size * 0.72, size * 1.65, size * 0.72);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (material.current) {
      material.current.opacity = 0.35 + flow.current * 0.6;
    }
  });

  return (
    <instancedMesh ref={particles} args={[undefined, undefined, particleCount]}>
      <sphereGeometry args={[0.022, 8, 8]} />
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
export function JumperWire({
  wire,
  selected,
}: {
  wire: Wire;
  selected: boolean;
}) {
  const a = useMemo(
    () => vec(wire.a),
    [wire.a],
  );

  const b = useMemo(
    () => vec(wire.b),
    [wire.b],
  );

  const powerOn = useLab(
    (s) => s.powerOn,
  );

  const current = useLab(
    (s) =>
      Math.abs(
        s.sim.supplyCurrent,
      ),
  );

  const flowing =
    powerOn &&
    current > 0.00001;

  // Around 15 mA reads as a full-strength educational "current flow"
  // animation; tiny leakage currents are still visible, just slower.
  const flowStrength = THREE.MathUtils.clamp(current / 0.015, 0.18, 1);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(wire.id);
      }}
    >
      <TubeWire
        a={a}
        b={b}
        color={
          selected
            ? "#ffffff"
            : WIRE_HEX[
                wire.color
              ]
        }
      />

      <CurrentFlow
        a={a}
        b={b}
        active={flowing}
        color={
          wire.color === "black"
            ? "#ffffff"
            : "#fff7ed"
        }
        strength={flowStrength}
      />
    </group>
  );
}

function Lead({ from, to }: { from: THREE.Vector3; to: THREE.Vector3 }) {
  const { pos, quat, len } = useMemo(() => {
    const dir = to.clone().sub(from);
    const len = dir.length();
    const pos = from.clone().lerp(to, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { pos, quat, len };
  }, [from.x, from.y, from.z, to.x, to.y, to.z]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[0.012, 0.012, len, 8]} />
      <meshStandardMaterial color="#c4c8ce" metalness={0.7} roughness={0.25} />
    </mesh>
  );
}

const BAND: Record<number, [string, string, string]> = {
  220: ["#b91c1c", "#b91c1c", "#7c4a1e"],
  330: ["#c2410c", "#c2410c", "#7c4a1e"],
  1000: ["#7c4a1e", "#171717", "#b91c1c"],
  10000: ["#7c4a1e", "#171717", "#c2410c"],
};

function LedAura({
  position,
  color,
  active,
  brightness,
}: {
  position: THREE.Vector3;
  color: string;
  active: boolean;
  brightness: number;
}) {
  const halo = useRef<THREE.Mesh>(null);
  const haloMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const energy = useRef(0);

  useFrame(({ clock }, delta) => {
    energy.current = THREE.MathUtils.damp(
      energy.current,
      active ? brightness : 0,
      10,
      delta,
    );

    const shimmer = 0.94 + Math.sin(clock.getElapsedTime() * 6.4) * 0.06;
    const glow = energy.current * shimmer;

    if (halo.current) {
      const scale = 0.75 + glow * 0.85;
      halo.current.scale.setScalar(scale);
    }
    if (haloMaterial.current) {
      haloMaterial.current.opacity = glow * 0.18;
    }
    if (light.current) {
      light.current.intensity = glow * 8;
    }
  });

  return (
    <group position={position}>
      <pointLight ref={light} color={color} distance={2.5} decay={2} />
      <mesh ref={halo}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function PinLabel({
  position,
  label,
  polarity,
  description,
}: {
  position: THREE.Vector3;
  label: string;
  polarity?: "+" | "-";
  description?: string;
}) {
  return (
    <Html
      position={[
        position.x,
        position.y + 0.22,
        position.z,
      ]}
      center
      distanceFactor={5}
      occlude={false}
      style={{
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 7px",
          borderRadius: "7px",
          background:
            polarity === "+"
              ? "rgba(127, 29, 29, .96)"
              : polarity === "-"
                ? "rgba(15, 23, 42, .96)"
                : "rgba(15, 23, 42, .94)",
          border:
            polarity === "+"
              ? "1px solid rgba(248,113,113,.8)"
              : polarity === "-"
                ? "1px solid rgba(148,163,184,.65)"
                : "1px solid rgba(255,255,255,.18)",
          color:
            polarity === "+"
              ? "#fecaca"
              : polarity === "-"
                ? "#e2e8f0"
                : "#f8fafc",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "9px",
          fontWeight: 800,
          whiteSpace: "nowrap",
          boxShadow:
            "0 4px 14px rgba(0,0,0,.45)",
        }}
      >
        {polarity ? (
          <span
            style={{
              fontSize: "13px",
              fontWeight: 900,
            }}
          >
            {polarity}
          </span>
        ) : null}

        <span>{label}</span>

        {description ? (
          <span
            style={{
              opacity: 0.65,
              fontWeight: 600,
            }}
          >
            {description}
          </span>
        ) : null}
      </div>
    </Html>
  );
}

export function ResistorMesh({
  part,
  selected,
}: {
  part: PlacedPart;
  selected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const a = vec(part.pins.a);
  const b = vec(part.pins.b);

  const body = a.clone().lerp(b, 0.5);
  body.y += 0.12;

  const dir = b.clone().sub(a);
  dir.y = 0;

  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    dir.clone().normalize(),
  );

  const bands =
    BAND[part.props.resistance ?? 1000] ?? BAND[1000];

  return (
    <group
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();

        useLab.getState().select(part.id);
      }}
    >
      {/* LEADS */}

      <Lead
        from={a}
        to={body
          .clone()
          .add(
            new THREE.Vector3(-0.16, 0, 0)
              .applyQuaternion(quat),
          )}
      />

      <Lead
        from={b}
        to={body
          .clone()
          .add(
            new THREE.Vector3(0.16, 0, 0)
              .applyQuaternion(quat),
          )}
      />

      {/* RESISTOR BODY */}

      <group
        position={body}
        quaternion={quat}
      >
        <mesh>
          <capsuleGeometry
            args={[0.045, 0.22, 6, 12]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#fde68a"
                : "#d6b07c"
            }
            roughness={0.55}
          />
        </mesh>

        {/* RESISTOR BANDS */}

        {bands.map((c, i) => (
          <mesh
            key={c + i}
            position={[
              -0.06 + i * 0.055,
              0,
              0,
            ]}
          >
            <cylinderGeometry
              args={[
                0.048,
                0.048,
                0.02,
                12,
              ]}
            />

            <meshStandardMaterial color={c} />
          </mesh>
        ))}
      </group>

      {/* PIN LABELS — HOVER ONLY */}

      {hovered && (
        <>
          <PinLabel
            position={a}
            label="PIN 1"
            description="non-polar"
          />

          <PinLabel
            position={b}
            label="PIN 2"
            description="non-polar"
          />
        </>
      )}
    </group>
  );
}


export function LedMesh({
  
  part,
  selected,
  sim,
}: {
  part: PlacedPart;
  selected: boolean;
  sim: SimResult;
}) {
  const [hovered, setHovered] = useState(false);
  const a = vec(part.pins.a);
  const k = vec(part.pins.k);

  const body = a
    .clone()
    .lerp(k, 0.5);

  body.y += 0.16;

  const color =
    LED_HEX[
      part.props.ledColor ?? "red"
    ];

  const state =
    sim.leds[part.id];

  const brightness =
    state?.brightness ?? 0;

  const isOn =
    Boolean(state?.on);

  const lensMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const lensEnergy = useRef(0);

  useFrame(({ clock }, delta) => {
    lensEnergy.current = THREE.MathUtils.damp(
      lensEnergy.current,
      isOn ? brightness : 0,
      11,
      delta,
    );

    if (lensMaterial.current) {
      const shimmer = 0.96 + Math.sin(clock.getElapsedTime() * 6.4) * 0.04;
      lensMaterial.current.emissiveIntensity =
        0.06 + lensEnergy.current * 5.5 * shimmer;
    }
  });

  return (
    <group
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(part.id);
      }}
    >
      {/* ANODE LEAD */}

      <Lead
        from={a}
        to={body}
      />

      {/* CATHODE LEAD */}

      <Lead
        from={k}
        to={body}
      />

      {/* ANODE TERMINAL */}

      <mesh
        position={[
          a.x,
          a.y + 0.045,
          a.z,
        ]}
      >
        <sphereGeometry
          args={[
            0.045,
            14,
            14,
          ]}
        />

        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* CATHODE TERMINAL */}

      <mesh
        position={[
          k.x,
          k.y + 0.045,
          k.z,
        ]}
      >
        <sphereGeometry
          args={[
            0.045,
            14,
            14,
          ]}
        />

        <meshStandardMaterial
          color="#111827"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* LED BODY */}

      <mesh
        position={body}
        scale={
          selected
            ? [1.15, 1.15, 1.15]
            : [1, 1, 1]
        }
      >
        <sphereGeometry
          args={[
            0.09,
            24,
            18,
          ]}
        />

        <meshStandardMaterial
          ref={lensMaterial}
          color={
            selected
              ? "#ffffff"
              : color
          }
          emissive={color}
          emissiveIntensity={0.06}
          roughness={0.12}
          metalness={0.05}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* LED BASE */}

      <mesh
        position={[
          body.x,
          body.y - 0.06,
          body.z,
        ]}
      >
        <cylinderGeometry
          args={[
            0.055,
            0.06,
            0.07,
            16,
          ]}
        />

        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.5}
          roughness={0.25}
        />
      </mesh>

      {/* GLOW */}

      <LedAura
        position={body}
        color={color}
        active={isOn}
        brightness={brightness}
      />

      {/* POLARITY ??? HOVER ONLY */}

{hovered && (
  <>
    <PinLabel
      position={a}
      label="ANODE"
      polarity="+"
      description="positive"
    />

    <PinLabel
      position={k}
      label="CATHODE"
      polarity="-"
      description="negative"
    />
  </>
)}

      {/* COMPONENT NAME */}

      <Html
        position={[
          body.x,
          body.y + 0.28,
          body.z,
        ]}
        center
        distanceFactor={5}
      >
        <div
          style={{
            color: "#f8fafc",
            fontSize: "10px",
            fontWeight: 900,
            textShadow:
              "0 2px 6px #000",
          }}
        >
          {part.props.label ||
            "LED"}
        </div>
      </Html>
    </group>
  );
}

export function DiodeMesh({
  part,
  selected,
  sim,
}: {
  part: PlacedPart;
  selected: boolean;
  sim: SimResult;
}) {
  const [hovered, setHovered] = useState(false);
  const a = vec(part.pins.a);
  const k = vec(part.pins.k);

  const body = a.clone().lerp(k, 0.5);
  body.y += 0.12;

  const dir = k.clone().sub(a);
  dir.y = 0;

  const quat =
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      dir.normalize(),
    );
  const conducting = Boolean(sim.diodes[part.id]?.on);

  return (
    <group
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
    e.stopPropagation();

    useLab
      .getState()
      .select(part.id);
  }}
>
      <Lead
        from={a}
        to={body}
      />

      <Lead
        from={k}
        to={body}
      />

      {/* DIODE BODY */}

      <group
        position={body}
        quaternion={quat}
      >
        <mesh>
          <cylinderGeometry
            args={[
              0.065,
              0.065,
              0.24,
              16,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#e2e8f0"
                : "#d5d9df"
            }
            metalness={0.35}
            roughness={0.3}
          />
        </mesh>

        {/* CATHODE BAND */}

        <mesh
          position={[
            0.075,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.068,
              0.068,
              0.035,
              16,
            ]}
          />

          <meshStandardMaterial
            color="#111827"
            metalness={0.45}
          />
        </mesh>

        {/* TRIANGLE-LIKE CONDUCTION INDICATOR */}

        <mesh
          position={[
            0,
            0.072,
            0,
          ]}
          rotation={[
            0,
            0,
            Math.PI / 2,
          ]}
        >
          <coneGeometry
            args={[
              0.025,
              0.08,
              3,
            ]}
          />

          <meshBasicMaterial
            color={conducting ? "#fbbf24" : "#7f1d1d"}
          />
        </mesh>
        {conducting ? (
          <pointLight position={[0, 0.08, 0]} color="#fbbf24" intensity={0.6} distance={0.8} />
        ) : null}
      </group>

     {/* POLARITY ??? HOVER ONLY */}

{hovered && (
  <>
    <PinLabel
      position={a}
      label="ANODE"
      polarity="+"
      description="positive"
    />

    <PinLabel
      position={k}
      label="CATHODE"
      polarity="-"
      description="negative"
    />
  </>
)}
      {part.props.label && (
        <Html
          position={[
            body.x,
            body.y + 0.2,
            body.z,
          ]}
          center
          distanceFactor={5}
        >
          <div
            style={{
              color: "white",
              fontSize: 10,
              fontWeight: 800,
              textShadow:
                "0 2px 5px #000",
            }}
          >
            {part.props.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function SwitchLever({
  closed,
  selected,
}: {
  closed: boolean;
  selected: boolean;
}) {
  const lever = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!lever.current) return;
    // A real lever pivots upward as the switch opens.  Damp the motion so
    // rapid clicks still feel weighty instead of snapping between states.
    lever.current.rotation.z = THREE.MathUtils.damp(
      lever.current.rotation.z,
      closed ? 0 : 0.64,
      16,
      delta,
    );
  });

  return (
    <>
      <mesh position={[-0.1, 0.1, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.08, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[0.1, 0.1, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.08, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.75} roughness={0.2} />
      </mesh>
      <group ref={lever} position={[-0.1, 0.12, 0]}>
        <mesh position={[0.1, 0, 0]} castShadow>
          <boxGeometry args={[0.22, 0.038, 0.075]} />
          <meshStandardMaterial
            color={closed ? "#34d399" : selected ? "#cbd5e1" : "#94a3b8"}
            emissive={closed ? "#065f46" : "#000000"}
            emissiveIntensity={closed ? 0.55 : 0}
            metalness={0.55}
            roughness={0.24}
          />
        </mesh>
      </group>
    </>
  );
}

export function SwitchMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.08;
  const closed = Boolean(part.props.closed);
  const orientation = useMemo(() => {
    const direction = b.clone().sub(a);
    direction.y = 0;
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      direction.normalize(),
    );
  }, [a.x, a.z, b.x, b.z]);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().toggleSwitch(part.id);
      }}
      >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />
      <group position={body} quaternion={orientation}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.08, 0.18]} />
          <meshStandardMaterial color={selected ? "#64748b" : "#2a3344"} roughness={0.34} />
        </mesh>
        <SwitchLever closed={closed} selected={selected} />
      </group>
    </group>
  );
}

export function CapacitorMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.16;
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />
      <mesh position={body}>
        <cylinderGeometry args={[0.07, 0.07, 0.22, 16]} />
        <meshStandardMaterial color={selected ? "#334155" : "#1e293b"} />
      </mesh>
      <mesh position={[body.x, body.y + 0.12, body.z]}>
        <cylinderGeometry args={[0.072, 0.072, 0.02, 16]} />
        <meshStandardMaterial color="#e8eef4" metalness={0.6} roughness={0.3} />
      </mesh>
<PinLabel
  position={a}
  label="PIN 1"
  description="non-polar"
/>

<PinLabel
  position={b}
  label="PIN 2"
  description="non-polar"
/>
    </group>
  );
}

export function InductorMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.14;
  const direction = b.clone().sub(a);
  direction.y = 0;
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    direction.normalize(),
  );

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body.clone().add(new THREE.Vector3(-0.14, 0, 0).applyQuaternion(quat))} />
      <Lead from={b} to={body.clone().add(new THREE.Vector3(0.14, 0, 0).applyQuaternion(quat))} />
      <group position={body} quaternion={quat}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.052, 0.052, 0.32, 16]} />
          <meshStandardMaterial color={selected ? "#fde68a" : "#1f2937"} roughness={0.5} />
        </mesh>
        {Array.from({ length: 9 }).map((_, index) => (
          <mesh key={index} position={[-0.12 + index * 0.03, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.058, 0.011, 8, 14]} />
            <meshStandardMaterial color="#c88a22" metalness={0.68} roughness={0.24} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function ButtonMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.1;
  const cap = useRef<THREE.Mesh>(null);
  const closed = Boolean(part.props.closed);

  useFrame((_, delta) => {
    if (!cap.current) return;
    cap.current.position.y = THREE.MathUtils.damp(
      cap.current.position.y,
      closed ? 0.065 : 0.105,
      20,
      delta,
    );
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().toggleSwitch(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />
      <group position={body}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.1, 0.24]} />
          <meshStandardMaterial color={selected ? "#475569" : "#202938"} roughness={0.36} />
        </mesh>
        <mesh ref={cap} position={[0, 0.105, 0]} castShadow>
          <cylinderGeometry args={[0.068, 0.075, 0.06, 16]} />
          <meshStandardMaterial
            color={closed ? "#ef4444" : "#cbd5e1"}
            emissive={closed ? "#7f1d1d" : "#000000"}
            emissiveIntensity={closed ? 0.5 : 0}
            roughness={0.24}
          />
        </mesh>
      </group>
    </group>
  );
}

export function BuzzerMesh({
  part,
  selected,
  sim,
}: {
  part: PlacedPart;
  selected: boolean;
  sim: SimResult;
}) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.13;
  const membrane = useRef<THREE.Mesh>(null);
  const state = sim.buzzers[part.id];

  useFrame(({ clock }, delta) => {
    if (!membrane.current) return;
    const loudness = state?.on ? state.loudness : 0;
    const vibration = loudness
      ? Math.sin(clock.getElapsedTime() * 42) * (0.012 + loudness * 0.018)
      : 0;
    membrane.current.position.y = THREE.MathUtils.damp(
      membrane.current.position.y,
      0.075 + vibration,
      38,
      delta,
    );
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />
      <group position={body}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.1, 0.12, 22]} />
          <meshStandardMaterial color={selected ? "#475569" : "#151b25"} roughness={0.34} />
        </mesh>
        <mesh ref={membrane} position={[0, 0.075, 0]}>
          <cylinderGeometry args={[0.086, 0.086, 0.012, 20]} />
          <meshStandardMaterial
            color={state?.on ? "#38bdf8" : "#334155"}
            emissive={state?.on ? "#075985" : "#000000"}
            emissiveIntensity={state?.on ? 0.8 : 0}
            roughness={0.22}
          />
        </mesh>
        <mesh position={[0, 0.085, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.016, 16]} />
          <meshStandardMaterial color="#020617" />
        </mesh>
      </group>
    </group>
  );
}

function RelayArm({ active }: { active: boolean }) {
  const arm = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!arm.current) return;
    arm.current.rotation.z = THREE.MathUtils.damp(
      arm.current.rotation.z,
      active ? 0 : 0.46,
      16,
      delta,
    );
  });

  return (
    <group ref={arm} position={[-0.12, 0.22, 0]}>
      <mesh position={[0.12, 0, 0]}>
        <boxGeometry args={[0.25, 0.025, 0.04]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.78} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function RelayMesh({
  part,
  selected,
  sim,
}: {
  part: PlacedPart;
  selected: boolean;
  sim: SimResult;
}) {
  const pins = Object.values(part.pins).map(vec);
  const body = pins.reduce((sum, pin) => sum.add(pin), new THREE.Vector3()).multiplyScalar(1 / pins.length);
  body.y += 0.22;
  const active = Boolean(sim.relays[part.id]?.on);

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      {pins.map((pin, index) => <Lead key={index} from={pin} to={body} />)}
      <group position={body}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.28, 0.38]} />
          <meshStandardMaterial
            color={selected ? "#334155" : "#111827"}
            transparent
            opacity={0.9}
            roughness={0.24}
          />
        </mesh>
        <mesh position={[-0.1, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.24, 16]} />
          <meshStandardMaterial
            color={active ? "#f59e0b" : "#b45309"}
            emissive={active ? "#78350f" : "#000000"}
            emissiveIntensity={active ? 0.55 : 0}
          />
        </mesh>
        <RelayArm active={active} />
        <mesh position={[0.14, 0.2, 0]}>
          <sphereGeometry args={[0.026, 12, 12]} />
          <meshStandardMaterial
            color={active ? "#4ade80" : "#334155"}
            emissive={active ? "#16a34a" : "#000000"}
            emissiveIntensity={active ? 1.2 : 0}
          />
        </mesh>
      </group>
    </group>
  );
}

export function McuMesh({
  part,
  selected,
  powered,
}: {
  part: PlacedPart;
  selected: boolean;
  powered: boolean;
}) {
  const p1 = vec(part.pins.p1 ?? part.pins.vcc ?? part.pins.gnd);
  const p8 = vec(part.pins.p8 ?? part.pins.gnd ?? part.pins.vcc);
  const cx = (p1.x + p8.x) / 2;
  const cz = (p1.z + p8.z) / 2;
  const width = Math.abs(p8.x - p1.x) + 0.16;
  const pins = Object.entries(part.pins).filter(([k]) => k.startsWith("p") || k === "vcc" || k === "gnd");
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      {pins.map(([name, hole]) => {
        const v = vec(hole);
        return (
          <mesh key={name} position={[v.x, 0.28, v.z]}>
            <boxGeometry args={[0.04, 0.22, 0.03]} />
            <meshStandardMaterial color="#c4c8ce" metalness={0.65} roughness={0.3} />
          </mesh>
        );
      })}
      <mesh position={[cx, 0.42, cz]} castShadow>
        <boxGeometry args={[width, 0.16, 0.78]} />
        <meshStandardMaterial color={selected ? "#334155" : "#111827"} roughness={0.45} />
      </mesh>
      <mesh position={[p1.x + 0.08, 0.51, cz - 0.28]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[cx, 0.51, cz + 0.22]}>
        <boxGeometry args={[0.08, 0.02, 0.08]} />
        <meshStandardMaterial
          color={powered ? "#4ade80" : "#14532d"}
          emissive={powered ? "#4ade80" : "#000"}
          emissiveIntensity={powered ? 2 : 0}
        />
      </mesh>
    </group>
  );
}

export function LcdMesh({
  part,
  selected,
  powered,
  text,
}: {
  part: PlacedPart;
  selected: boolean;
  powered: boolean;
  text: string;
}) {
  const origin = vec(part.pins.vss);
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 140;
    const ctx = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { c, ctx, t };
  }, []);

  useEffect(() => {
    const { c, ctx, t } = tex;
    ctx.fillStyle = powered ? "#0b3a9a" : "#07111d";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = powered ? "#7ec8e3" : "#0a1a28";
    ctx.fillRect(12, 12, c.width - 24, c.height - 24);
    if (powered) {
      ctx.fillStyle = "#d7f4ff";
      ctx.font = "600 42px 'IBM Plex Mono', ui-monospace, monospace";
      ctx.fillText(text || "", 28, 62);
      ctx.fillText(text ? "_" : "", 28 + ctx.measureText(text || "").width + 4, 62);
      if (!text) {
        ctx.globalAlpha = 0.25;
        for (let r = 0; r < 2; r++) {
          for (let col = 0; col < 16; col++) {
            ctx.fillRect(28 + col * 28, 28 + r * 48, 22, 36);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
    t.needsUpdate = true;
  }, [powered, text, tex]);

  const pins = Object.values(part.pins);
  const last = vec(part.pins.d4 ?? part.pins.vss);
  const isCompact = !part.pins.d4;
  const cx = (origin.x + last.x) / 2 + (isCompact ? 0 : 0.35);
  const cz = isCompact ? (origin.z + last.z) / 2 : origin.z + 0.55;

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      {pins.map((h) => {
        const v = vec(h);
        return (
          <mesh key={h} position={[v.x, 0.26, v.z]}>
            <boxGeometry args={[0.035, 0.18, 0.03]} />
            <meshStandardMaterial color="#c4c8ce" metalness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[cx, 0.42, cz]} castShadow>
        <boxGeometry args={[2.55, 0.16, 1.15]} />
        <meshStandardMaterial color={selected ? "#1e293b" : "#0b1220"} />
      </mesh>
      <mesh position={[cx, 0.505, cz]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.28, 0.86]} />
        <meshStandardMaterial
          map={tex.t}
          emissive={powered ? "#1d4ed8" : "#000"}
          emissiveIntensity={powered ? 0.25 : 0}
          emissiveMap={tex.t}
        />
      </mesh>
    </group>
  );
}

export function PotMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.14;
  const knob = useRef<THREE.Mesh>(null);
  const turn = THREE.MathUtils.clamp(((part.props.resistance ?? 1000) - 220) / 9780, 0, 1);

  useFrame((_, delta) => {
    if (!knob.current) return;
    knob.current.rotation.y = THREE.MathUtils.damp(
      knob.current.rotation.y,
      -Math.PI * 1.65 * turn,
      12,
      delta,
    );
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={vec(part.pins.w)} to={body} />
      <Lead from={b} to={body} />
      <mesh position={body}>
        <cylinderGeometry args={[0.09, 0.09, 0.1, 16]} />
        <meshStandardMaterial color={selected ? "#334155" : "#1e293b"} />
      </mesh>
      <mesh ref={knob} position={[body.x, body.y + 0.08, body.z]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 10]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
    </group>
  );
}

export function PartSwitch({
  part,
  selected,
  sim,
}: {
  part: PlacedPart;
  selected: boolean;
  sim: SimResult;
}) {
  switch (part.kind) {
    case "resistor":
      return <ResistorMesh part={part} selected={selected} />;
    case "diode":
      return <DiodeMesh part={part} selected={selected} sim={sim} />;
    case "led":
      return <LedMesh part={part} selected={selected} sim={sim} />;
    case "switch":
      return <SwitchMesh part={part} selected={selected} />;
    case "button":
      return <ButtonMesh part={part} selected={selected} />;
    case "capacitor":
      return <CapacitorMesh part={part} selected={selected} />;
    case "inductor":
      return <InductorMesh part={part} selected={selected} />;
    case "buzzer":
      return <BuzzerMesh part={part} selected={selected} sim={sim} />;
    case "relay":
      return <RelayMesh part={part} selected={selected} sim={sim} />;
    case "mcu":
      return <McuMesh part={part} selected={selected} powered={sim.mcuPowered} />;
    case "lcd":
      return (
        <LcdMesh
          part={part}
          selected={selected}
          powered={sim.lcdPowered}
          text={sim.lcdText}
        />
      );
    case "pot":
      return <PotMesh part={part} selected={selected} />;
    default:
      return null;
  }
}

function PowerStatusLight({
  powered,
  strength,
}: {
  powered: boolean;
  strength: number;
}) {
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const lens = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const pulse = powered ? 0.82 + Math.sin(clock.getElapsedTime() * 3.6) * 0.18 : 0;
    const energy = pulse * (0.28 + strength * 0.72);
    if (material.current) material.current.emissiveIntensity = energy * 2.4;
    if (lens.current) lens.current.scale.setScalar(0.92 + energy * 0.12);
  });

  return (
    <mesh ref={lens} position={[0.7, 0.84, 0.42]}>
      <sphereGeometry args={[0.045, 12, 12]} />
      <meshStandardMaterial
        ref={material}
        color={powered ? "#4ade80" : "#334155"}
        emissive={powered ? "#22c55e" : "#000000"}
        emissiveIntensity={0}
        roughness={0.2}
      />
    </mesh>
  );
}

export function PowerSupply() {
  const voltage = useLab((s) => s.psuVoltage);
  const powerOn = useLab((s) => s.powerOn);
  const pos = useLab((s) => s.psuPositive);
  const neg = useLab((s) => s.psuNegative);
  const current = useLab((s) => Math.abs(s.sim.supplyCurrent));
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 96;
    const ctx = c.getContext("2d")!;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, ctx, t };
  }, []);

  useEffect(() => {
    const { c, ctx, t } = tex;
    ctx.fillStyle = "#140404";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = powerOn ? "#ef4444" : "#4a1515";
    ctx.font = "700 56px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(powerOn ? voltage.toFixed(1) : "- -", 128, 64);
    t.needsUpdate = true;
  }, [voltage, powerOn, tex]);

  const destPos = pos ? vec(pos) : new THREE.Vector3(-3.85, 0.52, -0.35);
  const destNeg = neg ? vec(neg) : new THREE.Vector3(-3.85, 0.52, 0.25);
  const jackRed = useMemo(() => new THREE.Vector3(-3.85, 0.52, -0.35), []);
  const jackBlk = useMemo(() => new THREE.Vector3(-3.85, 0.52, 0.25), []);
  const flowing = powerOn && current > 0.00001;
  const flowStrength = THREE.MathUtils.clamp(current / 0.015, 0.18, 1);

  return (
    <>
      <group position={[-4.55, 0, 0]}>
        <mesh position={[0, 0.62, 0]} castShadow>
          <boxGeometry args={[1.35, 1.24, 1.7]} />
          <meshStandardMaterial color="#eef1f5" roughness={0.35} />
        </mesh>
        <mesh position={[0.68, 0.85, -0.15]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.9, 0.34]} />
          <meshStandardMaterial map={tex.t} emissive="#3f0a0a" emissiveIntensity={powerOn ? 0.4 : 0.05} />
        </mesh>
        <mesh position={[0.7, 0.52, -0.35]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 16]} />
          <meshStandardMaterial color="#c2413b" />
        </mesh>
        <mesh position={[0.7, 0.52, 0.25]}>
          <cylinderGeometry args={[0.07, 0.07, 0.08, 16]} />
          <meshStandardMaterial color="#1a1d23" />
        </mesh>
        <PowerStatusLight powered={powerOn} strength={flowStrength} />
      </group>
      <TubeWire a={jackRed} b={destPos} color="#c2413b" lift={1.4} radius={0.035} />
      <TubeWire a={jackBlk} b={destNeg} color="#1a1d23" lift={1.4} radius={0.035} />
      <CurrentFlow a={jackRed} b={destPos} active={flowing} color="#fff1f2" strength={flowStrength} />
      <CurrentFlow a={jackBlk} b={destNeg} active={flowing} color="#dbeafe" strength={flowStrength} />
    </>
  );
}

export function BreadboardBody() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const clickHole = useLab((s) => s.clickHole);
  const setHover = useLab((s) => s.setHover);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    ALL_HOLES.forEach((id, i) => {
      const [x, y, z] = holePosition(id);
      dummy.position.set(x, y - 0.01, z);
      dummy.rotation.x = Math.PI / 2;
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  return (
    <group>
      <mesh position={[0, 0.17, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.7, 0.34, 5.7]} />
        <meshStandardMaterial color="#f4f1ea" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.345, -2.5]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#c2413b" />
      </mesh>
      <mesh position={[0, 0.345, -2.2]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      <mesh position={[0, 0.345, 2.2]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#1d4ed8" />
      </mesh>
      <mesh position={[0, 0.345, 2.5]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#c2413b" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[6.55, 0.08, 0.42]} />
        <meshStandardMaterial color="#e7e2d8" />
      </mesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, ALL_HOLES.length]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0 || e.instanceId == null) return;
          clickHole(ALL_HOLES[e.instanceId]);
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          if (e.instanceId == null) return;
          setHover(ALL_HOLES[e.instanceId]);
        }}
        onPointerOut={() => setHover(null)}
      >
        <cylinderGeometry args={[0.036, 0.036, 0.1, 10]} />
        <meshStandardMaterial color="#1c2430" roughness={0.55} />
      </instancedMesh>
    </group>
  );
}
