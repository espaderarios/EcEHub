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
  BOARD,
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

declare global {
  interface Window {
    __ecePotDragging?: boolean;
  }
}

if (typeof window !== "undefined") {
  window.__ecePotDragging = false;
}

let potDraggingGlobal = false;

export function setPotDraggingGlobal(
  value: boolean,
) {
  potDraggingGlobal = value;
}

export function isPotDraggingGlobal() {
  return potDraggingGlobal;
}

const LED_HEX = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#facc15",
  orange: "#f97316",
  white: "#f8fafc",
  purple: "#a855f7",
  cyan: "#06b6d4",
};

const CAPACITOR_VALUES = [
  { value: 0.000001, label: "1 µF" },
  { value: 0.0000022, label: "2.2 µF" },
  { value: 0.0000047, label: "4.7 µF" },
  { value: 0.00001, label: "10 µF" },
  { value: 0.000022, label: "22 µF" },
  { value: 0.000047, label: "47 µF" },
  { value: 0.0001, label: "100 µF" },
  { value: 0.00022, label: "220 µF" },
  { value: 0.00047, label: "470 µF" },
  { value: 0.001, label: "1000 µF" },
];

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

  // ---------------------------------------------------------
  // PIN POSITIONS
  // ---------------------------------------------------------

  const a = vec(part.pins.a);
  const b = vec(part.pins.b);

  // Direction from pin 1 -> pin 2.
  // The resistor lies horizontally across the breadboard.
  const dir = b.clone().sub(a);
  dir.y = 0;

  const pinDistance = dir.length();

  if (pinDistance < 0.001) {
    return null;
  }

  dir.normalize();

  // ---------------------------------------------------------
  // RESISTOR DIMENSIONS
  // ---------------------------------------------------------

  // Size relative to the distance between the two breadboard
  // holes instead of using a completely fixed resistor size.
  const bodyLength = Math.min(
    0.34,
    Math.max(0.18, pinDistance * 0.52),
  );

  const bodyRadius = 0.052;

  // Height of the resistor above the breadboard.
  const bodyY = BOARD.height + 0.16;

  // Center of resistor body.
  const body = a.clone().lerp(b, 0.5);
  body.y = bodyY;

  // ---------------------------------------------------------
  // BODY ROTATION
  // ---------------------------------------------------------
  //
  // CapsuleGeometry is aligned along LOCAL Y.
  // Rotate local Y so it follows pin 1 -> pin 2.
  //

  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir,
  );

  // ---------------------------------------------------------
  // BODY END POINTS
  // ---------------------------------------------------------

  const halfBody = bodyLength / 2;

  const bodyA = body.clone().add(
    dir.clone().multiplyScalar(-halfBody),
  );

  const bodyB = body.clone().add(
    dir.clone().multiplyScalar(halfBody),
  );

  // ---------------------------------------------------------
  // LEAD GEOMETRY
  // ---------------------------------------------------------
  //
  // Each lead looks like:
  //
  //             resistor
  //       ╭────────────────╮
  // ──────╯                ╰──────
  //       │                    │
  //       │                    │
  //       ●                    ●
  //
  // The vertical section goes into the breadboard hole.
  //

  const leadRadius = 0.012;
  const leadHeight = bodyY - BOARD.height;

  function makeBentLead(
    pin: THREE.Vector3,
    bodyEnd: THREE.Vector3,
  ) {
    // Point directly underneath the resistor body end.
    const verticalTop = new THREE.Vector3(
      pin.x,
      bodyY,
      pin.z,
    );

    // Slightly inside the body before the lead enters it.
    const horizontalEnd = bodyEnd.clone();

    // Make a smooth 90-degree bend.
    const bendPoint = new THREE.Vector3(
      pin.x,
      BOARD.height + 0.035,
      pin.z,
    );

    const curve = new THREE.CatmullRomCurve3([
      pin.clone(),
      bendPoint.clone(),
      verticalTop.clone(),
      horizontalEnd.clone(),
    ]);

    curve.curveType = "centripetal";
    curve.tension = 0.15;

    return curve;
  }

  const leadCurveA = makeBentLead(a, bodyA);
  const leadCurveB = makeBentLead(b, bodyB);

  // ---------------------------------------------------------
  // RESISTOR COLOR BANDS
  // ---------------------------------------------------------

  const bands =
    BAND[part.props.resistance ?? 1000] ??
    BAND[1000];

  // Keep the bands centered around the body.
  const bandSpacing = Math.min(
    0.055,
    bodyLength * 0.18,
  );

  const bandStart =
    -((bands.length - 1) * bandSpacing) / 2;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <group
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();

        useLab.getState().select(part.id);
      }}
    >
      {/* =====================================================
          METAL LEAD — PIN 1
      ===================================================== */}

      <mesh
        castShadow
        receiveShadow
      >
        <tubeGeometry
          args={[
            leadCurveA,
            16,
            leadRadius,
            8,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#666666"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* =====================================================
          METAL LEAD — PIN 2
      ===================================================== */}

      <mesh
        castShadow
        receiveShadow
      >
        <tubeGeometry
          args={[
            leadCurveB,
            16,
            leadRadius,
            8,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#666666"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* =====================================================
          RESISTOR BODY
      ===================================================== */}

      <group
        position={body}
        quaternion={quat}
      >
        <mesh
          castShadow
          receiveShadow
        >
          <capsuleGeometry
            args={[
              bodyRadius,
              bodyLength,
              8,
              16,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#f4d58d"
                : "#d6b47c"
            }
            roughness={0.48}
            metalness={0}
          />
        </mesh>

        {/* =================================================
            COLOR BANDS
        ================================================= */}

        {bands.map((c, i) => (
          <mesh
            key={`${c}-${i}`}
            position={[
              0,
              bandStart + i * bandSpacing,
              0,
            ]}
            castShadow
          >
            <cylinderGeometry
              args={[
                bodyRadius + 0.003,
                bodyRadius + 0.003,
                0.019,
                16,
              ]}
            />

            <meshStandardMaterial
              color={c}
              roughness={0.35}
              metalness={0}
            />
          </mesh>
        ))}

        {/* =================================================
            SMALL END CAPS
        ================================================= */}

        <mesh
          position={[
            0,
            -bodyLength / 2,
            0,
          ]}
          castShadow
        >
          <sphereGeometry
            args={[
              bodyRadius * 0.96,
              16,
              12,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#f4d58d"
                : "#d6b47c"
            }
            roughness={0.48}
          />
        </mesh>

        <mesh
          position={[
            0,
            bodyLength / 2,
            0,
          ]}
          castShadow
        >
          <sphereGeometry
            args={[
              bodyRadius * 0.96,
              16,
              12,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#f4d58d"
                : "#d6b47c"
            }
            roughness={0.48}
          />
        </mesh>
      </group>

      {/* =====================================================
          PIN LABELS
      ===================================================== */}

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

  // ---------------------------------------------------------
  // PINS
  // ---------------------------------------------------------

  const a = vec(part.pins.a);
  const k = vec(part.pins.k);

  // Center of the LED between the two breadboard holes.
  const body = a.clone().lerp(k, 0.5);

  // LED stands vertically above the breadboard.
  const baseY = BOARD.height + 0.045;
  const bodyY = BOARD.height + 0.145;

  body.y = bodyY;

  // ---------------------------------------------------------
  // LED COLOR
  // ---------------------------------------------------------

  const color =
    LED_HEX[
      part.props.ledColor ?? "red"
    ] ?? "#ef4444";

  // ---------------------------------------------------------
  // SIMULATION STATE
  // ---------------------------------------------------------

  const state = sim.leds[part.id];

  const brightness =
    state?.brightness ?? 0;

  const isOn =
    Boolean(state?.on);

  // ---------------------------------------------------------
  // MATERIALS
  // ---------------------------------------------------------

  const lensMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  const dieMaterial =
    useRef<THREE.MeshStandardMaterial>(null);

  const lensEnergy =
    useRef(0);

  // ---------------------------------------------------------
  // LED LIGHT ANIMATION
  // ---------------------------------------------------------

  useFrame(({ clock }, delta) => {
    lensEnergy.current =
      THREE.MathUtils.damp(
        lensEnergy.current,
        isOn ? brightness : 0,
        10,
        delta,
      );

    const energy =
      lensEnergy.current;

    if (lensMaterial.current) {
      const shimmer =
        0.97 +
        Math.sin(
          clock.getElapsedTime() * 6,
        ) * 0.03;

      lensMaterial.current.emissiveIntensity =
        0.08 +
        energy * 3.8 * shimmer;
    }

    if (dieMaterial.current) {
      dieMaterial.current.emissiveIntensity =
        0.15 +
        energy * 5;
    }
  });

  // ---------------------------------------------------------
  // DIMENSIONS
  // ---------------------------------------------------------

  const baseRadius = 0.063;
  const baseHeight = 0.045;

  const domeRadius = 0.078;
  const domeHeight = 0.105;

  const leadRadius = 0.009;

  // ---------------------------------------------------------
  // LEAD HEIGHT
  // ---------------------------------------------------------

  const leadTopY =
    BOARD.height + 0.075;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <group
      onPointerEnter={() =>
        setHovered(true)
      }
      onPointerLeave={() =>
        setHovered(false)
      }
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(part.id);
      }}
    >
      {/* =====================================================
          ANODE LEAD
      ===================================================== */}

      <mesh
        position={[
          a.x,
          (a.y + leadTopY) / 2,
          a.z,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            leadRadius,
            leadRadius,
            Math.max(
              0.01,
              leadTopY - a.y,
            ),
            10,
          ]}
        />

        <meshStandardMaterial
          color="#b8bcc2"
          metalness={0.9}
          roughness={0.22}
        />
      </mesh>

      {/* =====================================================
          CATHODE LEAD
      ===================================================== */}

      <mesh
        position={[
          k.x,
          (k.y + leadTopY) / 2,
          k.z,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            leadRadius,
            leadRadius,
            Math.max(
              0.01,
              leadTopY - k.y,
            ),
            10,
          ]}
        />

        <meshStandardMaterial
          color="#aeb3b8"
          metalness={0.9}
          roughness={0.22}
        />
      </mesh>

      {/* =====================================================
          LED BASE / COLLAR
      ===================================================== */}

      <mesh
        position={[
          body.x,
          baseY,
          body.z,
        ]}
        scale={
          selected
            ? [1.1, 1.1, 1.1]
            : [1, 1, 1]
        }
        castShadow
        receiveShadow
      >
        <cylinderGeometry
          args={[
            baseRadius,
            baseRadius * 1.05,
            baseHeight,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#e5e7eb"
          metalness={0.2}
          roughness={0.3}
        />
      </mesh>

      {/* =====================================================
          LED COLLAR
      ===================================================== */}

      <mesh
        position={[
          body.x,
          baseY + 0.025,
          body.z,
        ]}
        castShadow
      >
        <cylinderGeometry
          args={[
            0.053,
            0.058,
            0.032,
            24,
          ]}
        />

        <meshStandardMaterial
          color="#f1f5f9"
          metalness={0.12}
          roughness={0.28}
        />
      </mesh>

      {/* =====================================================
          COLORED LED DOME
      ===================================================== */}

      <mesh
        position={[
          body.x,
          baseY +
            baseHeight * 0.55 +
            domeHeight * 0.47,
          body.z,
        ]}
        scale={
          selected
            ? [1.08, 1.08, 1.08]
            : [1, 1, 1]
        }
        castShadow
      >
        <sphereGeometry
          args={[
            domeRadius,
            32,
            24,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />

        <meshStandardMaterial
          ref={lensMaterial}
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          roughness={0.18}
          metalness={0}
          transparent
          opacity={0.78}
          depthWrite={true}
        />
      </mesh>

      {/* =====================================================
          INNER LED DIE
      ===================================================== */}

      <mesh
        ref={dieMaterial}
        position={[
          body.x,
          baseY + 0.075,
          body.z,
        ]}
      >
        <boxGeometry
          args={[
            0.018,
            0.024,
            0.018,
          ]}
        />

        <meshStandardMaterial
          color="#fff7d6"
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>

      {/* =====================================================
          INTERNAL REFLECTOR
      ===================================================== */}

      <mesh
        position={[
          body.x,
          baseY + 0.058,
          body.z,
        ]}
      >
        <cylinderGeometry
          args={[
            0.034,
            0.023,
            0.012,
            20,
          ]}
        />

        <meshStandardMaterial
          color="#f8fafc"
          metalness={0.8}
          roughness={0.18}
        />
      </mesh>

      {/* =====================================================
          LED GLOW
      ===================================================== */}

      <LedAura
        position={body}
        color={color}
        active={isOn}
        brightness={brightness}
      />

      {/* =====================================================
          HOVER LABELS
      ===================================================== */}

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

      {/* =====================================================
          COMPONENT NAME
      ===================================================== */}

      <Html
        position={[
          body.x,
          body.y + 0.24,
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
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {part.props.label || "LED"}
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

  // =========================================================
  // PIN POSITIONS
  // =========================================================

  const a = vec(part.pins.a);
  const k = vec(part.pins.k);

  // Direction from ANODE -> CATHODE
  const dir = k.clone().sub(a);
  dir.y = 0;

  const pinDistance = dir.length();

  if (pinDistance < 0.001) {
    return null;
  }

  dir.normalize();

  // =========================================================
  // SIMULATION
  // =========================================================

  const conducting =
    Boolean(sim.diodes[part.id]?.on);

  // =========================================================
  // BODY POSITION
  // =========================================================

  const body = a.clone().lerp(k, 0.5);

  body.y = BOARD.height + 0.14;

  // =========================================================
  // BODY DIMENSIONS
  // =========================================================

  const bodyLength = Math.min(
    0.50,
    Math.max(
      0.28,
      pinDistance * 0.60,
    ),
  );

  const bodyRadius = 0.075;

  const halfBody = bodyLength / 2;

  // =========================================================
  // CATHODE SILVER STRIP
  // =========================================================

  // The strip is deliberately thick and slightly larger
  // than the black body.

  const cathodeStripWidth = 0.065;

  const cathodeStripRadius =
    bodyRadius * 1.10;

  // Position it close to the cathode end.
  const cathodeStripPosition =
    halfBody - 0.075;

  // =========================================================
  // ANODE SILVER COLLAR
  // =========================================================

  const anodeCollarWidth = 0.035;

  const anodeCollarRadius =
    bodyRadius * 1.035;

  // =========================================================
  // ROTATION
  // =========================================================

  // CylinderGeometry points along local Y.
  // Rotate local Y to follow ANODE -> CATHODE.

  const quat =
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    );

  // =========================================================
  // BODY END POSITIONS
  // =========================================================

  const anodeEnd =
    body.clone().add(
      dir
        .clone()
        .multiplyScalar(-halfBody),
    );

  const cathodeEnd =
    body.clone().add(
      dir
        .clone()
        .multiplyScalar(halfBody),
    );

  // =========================================================
  // LEADS
  // =========================================================

  const leadRadius = 0.012;

  const leadBendY =
    BOARD.height + 0.035;

  const leadTopY =
    body.y;

  function createLeadCurve(
    pin: THREE.Vector3,
    bodyEnd: THREE.Vector3,
  ) {
    return new THREE.CatmullRomCurve3(
      [
        pin.clone(),

        new THREE.Vector3(
          pin.x,
          leadBendY,
          pin.z,
        ),

        new THREE.Vector3(
          pin.x,
          leadTopY - 0.035,
          pin.z,
        ),

        bodyEnd.clone(),
      ],
      false,
      "centripetal",
      0.2,
    );
  }

  const anodeLead =
    createLeadCurve(
      a,
      anodeEnd,
    );

  const cathodeLead =
    createLeadCurve(
      k,
      cathodeEnd,
    );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <group
      onPointerEnter={() =>
        setHovered(true)
      }
      onPointerLeave={() =>
        setHovered(false)
      }
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(part.id);
      }}
    >

      {/* =====================================================
          ANODE LEAD
      ===================================================== */}

      <mesh castShadow>
        <tubeGeometry
          args={[
            anodeLead,
            24,
            leadRadius,
            10,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#8b8f94"
          metalness={0.8}
          roughness={0.22}
        />
      </mesh>


      {/* =====================================================
          CATHODE LEAD
      ===================================================== */}

      <mesh castShadow>
        <tubeGeometry
          args={[
            cathodeLead,
            24,
            leadRadius,
            10,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#8b8f94"
          metalness={0.8}
          roughness={0.22}
        />
      </mesh>


      {/* =====================================================
          DIODE
      ===================================================== */}

      <group
        position={body}
        quaternion={quat}
        scale={
          selected
            ? [1.08, 1.08, 1.08]
            : [1, 1, 1]
        }
      >

        {/* ===================================================
            MAIN BLACK BODY
        =================================================== */}

        <mesh
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              bodyRadius,
              bodyRadius,
              bodyLength,
              32,
              1,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#242424"
                : "#050505"
            }
            metalness={0.35}
            roughness={0.28}
          />
        </mesh>


        {/* ===================================================
            ANODE SILVER COLLAR
        =================================================== */}

        <mesh
          position={[
            0,
            -halfBody +
              anodeCollarWidth / 2,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              anodeCollarRadius,
              anodeCollarRadius,
              anodeCollarWidth,
              32,
              1,
            ]}
          />

          <meshStandardMaterial
            color="#bfc3c7"
            metalness={0.65}
            roughness={0.25}
            emissive="#222222"
            emissiveIntensity={0.15}
          />
        </mesh>


        {/* ===================================================
            CATHODE WHITE STRIP
        =================================================== */}

        <mesh
          position={[
            0,
            cathodeStripPosition,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              cathodeStripRadius,
              cathodeStripRadius,
              cathodeStripWidth,
              32,
              1,
            ]}
          />

          <meshStandardMaterial
            color="#ffffff"
            metalness={0}
            roughness={0.35}
            emissive="#ffffff"
            emissiveIntensity={0.15}
          />
        </mesh>


        {/* ===================================================
            WHITE STRIP HIGHLIGHT
        =================================================== */}

        <mesh
          position={[
            0,
            cathodeStripPosition +
              cathodeStripWidth / 2 -
              0.006,
            0,
          ]}
          castShadow
        >
          <cylinderGeometry
            args={[
              cathodeStripRadius * 1.015,
              cathodeStripRadius * 1.015,
              0.012,
              32,
              1,
            ]}
          />

          <meshStandardMaterial
            color="#ffffff"
            metalness={0}
            roughness={0.25}
            emissive="#ffffff"
            emissiveIntensity={0.2}
          />
        </mesh>

        {/* ===================================================
            BLACK CATHODE END
        =================================================== */}

        <mesh
          position={[
            0,
            halfBody - 0.006,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry
            args={[
              bodyRadius * 1.005,
              bodyRadius * 1.005,
              0.018,
              32,
              1,
            ]}
          />

          {/* THIS MUST BE BLACK */}

          <meshStandardMaterial
            color="#020202"
            metalness={0.35}
            roughness={0.28}
          />
        </mesh>


        {/* ===================================================
            CONDUCTION GLOW
        =================================================== */}

        {conducting && (
          <pointLight
            position={[
              0,
              0,
              0,
            ]}
            color="#fbbf24"
            intensity={0.20}
            distance={0.60}
          />
        )}

      </group>


      {/* =====================================================
          HOVER POLARITY LABELS
      ===================================================== */}

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


      {/* =====================================================
          COMPONENT NAME
      ===================================================== */}

      {part.props.label && (
        <Html
          position={[
            body.x,
            body.y + 0.20,
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
              pointerEvents:
                "none",
              whiteSpace:
                "nowrap",
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

    lever.current.rotation.x = THREE.MathUtils.damp(
      lever.current.rotation.x,
      closed ? -0.08 : 0.10,
      14,
      delta,
    );
  });

  return (
    <group ref={lever}>

      {/* BLUE ACTUATOR BASE */}
      <mesh
        position={[0, 0.19, 0]}
        castShadow
      >
        <boxGeometry
          args={[0.115, 0.075, 0.12]}
        />

        <meshStandardMaterial
          color={
            selected
              ? "#60a5fa"
              : "#2563eb"
          }
          roughness={0.25}
          metalness={0.02}
        />
      </mesh>

      {/* BLUE BUTTON */}
      <mesh
        position={[0, 0.255, 0]}
        castShadow
      >
        <boxGeometry
          args={[0.075, 0.085, 0.075]}
        />

        <meshStandardMaterial
          color={
            closed
              ? "#2563eb"
              : "#1d4ed8"
          }
          roughness={0.22}
          metalness={0.02}
        />
      </mesh>

      {/* TOP OF BUTTON */}
      <mesh
        position={[0, 0.302, 0]}
        castShadow
      >
        <boxGeometry
          args={[0.06, 0.025, 0.06]}
        />

        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.2}
        />
      </mesh>

    </group>
  );
}


export function SwitchMesh({
  part,
  selected,
}: {
  part: PlacedPart;
  selected: boolean;
}) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);

  // =========================================================
  // CENTER
  // =========================================================

  const body = a.clone().lerp(b, 0.5);

  body.y = BOARD.height + 0.10;


  // =========================================================
  // ORIENTATION
  // =========================================================

  const orientation = useMemo(() => {
    const direction = b.clone().sub(a);

    direction.y = 0;

    if (direction.lengthSq() < 0.0001) {
      return new THREE.Quaternion();
    }

    direction.normalize();

    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      direction,
    );
  }, [a.x, a.z, b.x, b.z]);


  const closed = Boolean(part.props.closed);


  // =========================================================
  // 6 PHYSICAL PINS
  //
  // 3 pins on one side
  // 3 pins on the other side
  //
  //       ●   ●   ●
  //
  //       SWITCH
  //
  //       ●   ●   ●
  // =========================================================

  const pinX = 0.105;
  const pinZ = 0.075;

  const pinPositions = [
    // FRONT / TOP ROW
    [-pinX, -0.12, -pinZ],
    [0,     -0.12, -pinZ],
    [pinX,  -0.12, -pinZ],

    // BACK / BOTTOM ROW
    [-pinX, -0.12, pinZ],
    [0,     -0.12, pinZ],
    [pinX,  -0.12, pinZ],
  ];


  return (
    <group
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .toggleSwitch(part.id);
      }}
    >

      {/* =====================================================
          SWITCH BODY
      ===================================================== */}

      <group
        position={body}
        quaternion={orientation}
      >

        {/* ===================================================
            SIX METAL PINS
        =================================================== */}

        {pinPositions.map(
          ([x, y, z], index) => (
            <mesh
              key={`switch-pin-${index}`}
              position={[x, y, z]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  0.012,
                  0.012,
                  0.14,
                  10,
                ]}
              />

              <meshStandardMaterial
                color="#8b9299"
                metalness={0.9}
                roughness={0.2}
              />
            </mesh>
          ),
        )}


        {/* ===================================================
            BLACK LOWER BODY
        =================================================== */}

        <mesh
          position={[
            0,
            0,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              0.34,
              0.13,
              0.24,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#374151"
                : "#111111"
            }
            roughness={0.32}
            metalness={0.08}
          />
        </mesh>


        {/* ===================================================
            WHITE UPPER HOUSING
        =================================================== */}

        <mesh
          position={[
            0,
            0.085,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[
              0.36,
              0.075,
              0.26,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#ffffff"
                : "#e5e7eb"
            }
            roughness={0.38}
            metalness={0.02}
          />
        </mesh>


        {/* ===================================================
            WHITE TOP SURFACE
        =================================================== */}

        <mesh
          position={[
            0,
            0.135,
            0,
          ]}
          castShadow
        >
          <boxGeometry
            args={[
              0.31,
              0.035,
              0.21,
            ]}
          />

          <meshStandardMaterial
            color="#f8fafc"
            roughness={0.3}
            metalness={0.01}
          />
        </mesh>


        {/* ===================================================
            BLUE ACTUATOR
        =================================================== */}

        <SwitchLever
          closed={closed}
          selected={selected}
        />

      </group>


      {/* =====================================================
          ELECTRICAL CONNECTION LEADS
      ===================================================== */}

      <Lead
        from={a}
        to={body.clone().add(
          new THREE.Vector3(
            -0.105,
            0,
            0,
          ).applyQuaternion(
            orientation,
          ),
        )}
      />

      <Lead
        from={b}
        to={body.clone().add(
          new THREE.Vector3(
             0.105,
            0,
            0,
          ).applyQuaternion(
            orientation,
          ),
        )}
      />


      {/* =====================================================
          COMPONENT LABEL
      ===================================================== */}

      {part.props.label && (
        <Html
          position={[
            body.x,
            body.y + 0.36,
            body.z,
          ]}
          center
          distanceFactor={5}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: 800,
              textShadow:
                "0 2px 5px #000",
              pointerEvents:
                "none",
              whiteSpace:
                "nowrap",
            }}
          >
            {part.props.label}
          </div>
        </Html>
      )}

    </group>
  );
}

export function CapacitorMesh({
  part,
  selected,
}: {
  part: PlacedPart;
  selected: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  // =========================================================
  // PIN POSITIONS
  // =========================================================

  const a = vec(part.pins.a);
  const b = vec(part.pins.b);

  const direction = b.clone().sub(a);
  direction.y = 0;

  const pinDistance = direction.length();

  if (pinDistance < 0.001) {
    return null;
  }

  direction.normalize();

  // =========================================================
  // CAPACITANCE VALUE
  // =========================================================

  const rawValue =
    part.props.capacitance ??
    part.props.value ??
    "100nF";

  const capacitance =
    typeof rawValue === "number"
      ? rawValue
      : parseCapacitance(String(rawValue));

  // =========================================================
  // CAPACITOR TYPE
  // =========================================================
  //
  // If capacitorType was explicitly selected, use it.
  // Otherwise automatically determine the appearance
  // from the capacitance value.
  //

  const explicitType = String(
    part.props.capacitorType ?? "",
  ).toLowerCase();

  const capacitorType =
    explicitType === "ceramic" ||
    explicitType === "film" ||
    explicitType === "electrolytic" ||
    explicitType === "tantalum"
      ? explicitType
      : getCapacitorVisualType(capacitance);

  // =========================================================
  // BODY POSITION
  // =========================================================

  const body = a.clone().lerp(b, 0.5);

  const bodyY =
    BOARD.height + 0.15;

  body.y = bodyY;

  // =========================================================
  // ROTATION
  // =========================================================

  const orientation =
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction,
    );

  // =========================================================
  // DIMENSIONS
  // =========================================================

  let radius = 0.075;
  let bodyLength = 0.20;

  switch (capacitorType) {
    case "ceramic":
      radius = 0.065;
      bodyLength = 0.115;
      break;

    case "film":
      radius = 0.085;
      bodyLength = 0.22;
      break;

    case "electrolytic":
      radius = 0.085;
      bodyLength = 0.27;
      break;

    case "tantalum":
      radius = 0.08;
      bodyLength = 0.18;
      break;
  }

  const halfLength =
    bodyLength / 2;

  // =========================================================
  // BODY ENDS
  // =========================================================

  const bodyEndA =
    body
      .clone()
      .add(
        direction
          .clone()
          .multiplyScalar(-halfLength),
      );

  const bodyEndB =
    body
      .clone()
      .add(
        direction
          .clone()
          .multiplyScalar(halfLength),
      );

  // =========================================================
  // LEADS
  // =========================================================

  const leadRadius = 0.012;

  const leadA =
    createCapacitorLead(
      a,
      bodyEndA,
      bodyY,
    );

  const leadB =
    createCapacitorLead(
      b,
      bodyEndB,
      bodyY,
    );

  // =========================================================
  // COLORS
  // =========================================================

  let bodyColor = "#d6a84f";

  if (capacitorType === "ceramic") {
    bodyColor = "#d9a441";
  }

  if (capacitorType === "film") {
    bodyColor = "#16803c";
  }

  if (capacitorType === "electrolytic") {
    bodyColor = "#111827";
  }

  if (capacitorType === "tantalum") {
    bodyColor = "#d97745";
  }

  if (selected) {
    bodyColor = "#f8fafc";
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <group
      onPointerEnter={() =>
        setHovered(true)
      }
      onPointerLeave={() =>
        setHovered(false)
      }
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(part.id);
      }}
    >

      {/* =====================================================
          LEAD 1
      ===================================================== */}

      <mesh castShadow>
        <tubeGeometry
          args={[
            leadA,
            20,
            leadRadius,
            10,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#8b9096"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* =====================================================
          LEAD 2
      ===================================================== */}

      <mesh castShadow>
        <tubeGeometry
          args={[
            leadB,
            20,
            leadRadius,
            10,
            false,
          ]}
        />

        <meshStandardMaterial
          color="#8b9096"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      {/* =====================================================
          CAPACITOR
      ===================================================== */}

      <group
        position={body}
        quaternion={orientation}
        scale={
          selected
            ? [1.08, 1.08, 1.08]
            : [1, 1, 1]
        }
      >

        {/* ===================================================
            CERAMIC
        =================================================== */}

        {capacitorType === "ceramic" && (
          <group>

            <mesh
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[
                  radius,
                  radius,
                  bodyLength,
                  24,
                ]}
              />

              <meshStandardMaterial
                color={bodyColor}
                metalness={0.05}
                roughness={0.34}
              />
            </mesh>

            {/* TOP CERAMIC CAP */}

            <mesh
              position={[
                0,
                halfLength + 0.006,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  radius * 0.88,
                  radius * 0.88,
                  0.012,
                  24,
                ]}
              />

              <meshStandardMaterial
                color="#f4c76a"
                roughness={0.3}
              />
            </mesh>

          </group>
        )}

        {/* ===================================================
            FILM
        =================================================== */}

        {capacitorType === "film" && (
          <group>

            <mesh
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[
                  radius * 1.9,
                  bodyLength,
                  radius * 1.5,
                ]}
              />

              <meshStandardMaterial
                color={bodyColor}
                metalness={0.05}
                roughness={0.3}
              />
            </mesh>

            {/* TOP FACE */}

            <mesh
              position={[
                0,
                halfLength + 0.005,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  radius * 1.55,
                  0.01,
                  radius * 1.2,
                ]}
              />

              <meshStandardMaterial
                color="#4ade80"
                roughness={0.25}
              />
            </mesh>

          </group>
        )}

        {/* ===================================================
            ELECTROLYTIC
        =================================================== */}

        {capacitorType === "electrolytic" && (
          <group>

            {/* MAIN CYLINDER */}

            <mesh
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[
                  radius,
                  radius,
                  bodyLength,
                  32,
                ]}
              />

              <meshStandardMaterial
                color={bodyColor}
                metalness={0.12}
                roughness={0.28}
              />
            </mesh>

            {/* TOP SILVER CAP */}

            <mesh
              position={[
                0,
                halfLength + 0.009,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  radius * 0.94,
                  radius * 0.94,
                  0.018,
                  32,
                ]}
              />

              <meshStandardMaterial
                color="#cbd5e1"
                metalness={0.85}
                roughness={0.22}
              />
            </mesh>

            {/* NEGATIVE STRIPE */}

            <mesh
              position={[
                radius * 0.73,
                0,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.018,
                  bodyLength * 0.72,
                  radius * 0.10,
                ]}
              />

              <meshStandardMaterial
                color="#f8fafc"
                metalness={0.1}
                roughness={0.3}
              />
            </mesh>

            {/* NEGATIVE MARK */}

            <mesh
              position={[
                radius * 0.73,
                halfLength + 0.019,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.028,
                  0.008,
                  0.045,
                ]}
              />

              <meshStandardMaterial
                color="#111827"
              />
            </mesh>

          </group>
        )}

        {/* ===================================================
            TANTALUM
        =================================================== */}

        {capacitorType === "tantalum" && (
          <group>

            <mesh
              castShadow
              receiveShadow
              scale={[
                1,
                1,
                0.85,
              ]}
            >
              <sphereGeometry
                args={[
                  radius,
                  24,
                  16,
                ]}
              />

              <meshStandardMaterial
                color={bodyColor}
                roughness={0.3}
                metalness={0.05}
              />
            </mesh>

            {/* POSITIVE MARK */}

            <mesh
              position={[
                0,
                radius * 0.78,
                0,
              ]}
            >
              <boxGeometry
                args={[
                  0.035,
                  0.008,
                  0.035,
                ]}
              />

              <meshStandardMaterial
                color="#f8fafc"
              />
            </mesh>

          </group>
        )}

      </group>

      {/* =====================================================
          VALUE LABEL
      ===================================================== */}

      {hovered && (
        <Html
          position={[
            body.x,
            body.y + 0.25,
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
              padding: "3px 6px",
              borderRadius: "4px",
              background:
                "rgba(2, 6, 23, 0.88)",
              border:
                "1px solid rgba(148,163,184,.35)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              textShadow:
                "0 1px 3px #000",
            }}
          >
            {formatCapacitance(capacitance)}
          </div>
        </Html>
      )}

      {/* =====================================================
          PIN LABELS
      ===================================================== */}

      {hovered && (
        <>
          <PinLabel
            position={a}
            label="PIN 1"
            description={
              capacitorType === "electrolytic" ||
              capacitorType === "tantalum"
                ? "positive"
                : "non-polar"
            }
          />

          <PinLabel
            position={b}
            label="PIN 2"
            description={
              capacitorType === "electrolytic" ||
              capacitorType === "tantalum"
                ? "negative"
                : "non-polar"
            }
          />
        </>
      )}

      {/* =====================================================
          COMPONENT LABEL
      ===================================================== */}

      {part.props.label && (
        <Html
          position={[
            body.x,
            body.y + 0.34,
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
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {part.props.label}
          </div>
        </Html>
      )}

    </group>
  );
}

function parseCapacitance(
  value: string,
): number {
  const v = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

  const match = v.match(
    /^([\d.]+)(pf|nf|uf|µf|mf|f)?$/,
  );

  if (!match) {
    return 100e-9;
  }

  const number = Number(match[1]);
  const unit = match[2] ?? "f";

  switch (unit) {
    case "pf":
      return number * 1e-12;

    case "nf":
      return number * 1e-9;

    case "uf":
    case "µf":
      return number * 1e-6;

    case "mf":
      return number * 1e-3;

    case "f":
    default:
      return number;
  }
}

function getCapacitorVisualType(
  capacitance: number,
): "ceramic" | "film" | "electrolytic" {
  // Very small capacitors
  if (capacitance < 1e-9) {
    return "ceramic";
  }

  // 1 nF – 100 nF
  if (capacitance < 100e-9) {
    return "ceramic";
  }

  // 100 nF – 1 µF
  if (capacitance < 1e-6) {
    return "film";
  }

  // 1 µF and above
  return "electrolytic";
}

function formatCapacitance(
  value: number,
): string {
  if (value >= 1) {
    return `${value} F`;
  }

  if (value >= 1e-3) {
    return `${(value * 1e3).toFixed(2)} mF`;
  }

  if (value >= 1e-6) {
    return `${(value * 1e6).toFixed(2)} µF`;
  }

  if (value >= 1e-9) {
    return `${(value * 1e9).toFixed(2)} nF`;
  }

  return `${(value * 1e12).toFixed(2)} pF`;
}

function createCapacitorLead(
  pin: THREE.Vector3,
  bodyEnd: THREE.Vector3,
  bodyY: number,
) {
  const bendY =
    BOARD.height + 0.035;

  const points = [
    pin.clone(),

    new THREE.Vector3(
      pin.x,
      bendY,
      pin.z,
    ),

    new THREE.Vector3(
      pin.x,
      bodyY - 0.035,
      pin.z,
    ),

    bodyEnd.clone(),
  ];

  return new THREE.CatmullRomCurve3(
    points,
    false,
    "centripetal",
    0.2,
  );
}

function createToroidWindingCurve(
  turns: number,
  majorRadius: number,
  coreRadius: number,
  wireRadius: number,
) {
  const curve = new THREE.Curve<THREE.Vector3>();

  curve.getPoint = (
    t: number,
    target = new THREE.Vector3(),
  ) => {
    /*
     * =========================================================
     * TOROIDAL WINDING
     * =========================================================
     *
     * The ferrite core is a vertical torus in the XY plane.
     *
     * theta:
     *   Goes around the ferrite tube.
     *
     * phi:
     *   Slowly advances around the complete toroid.
     *
     * This creates the actual "wire wrapped around a tire"
     * appearance from the reference.
     */

    const theta =
      t * turns * Math.PI * 2;

    const phi =
      t * Math.PI * 2;


    /*
     * Keep the copper just outside the ferrite.
     */
    const windingRadius =
      coreRadius + wireRadius + 0.006;


    /*
     * Radius from the center of the toroid.
     */
    const radial =
      majorRadius +
      windingRadius * Math.cos(theta);


    /*
     * IMPORTANT:
     *
     * XY plane = vertical toroid.
     *
     * Z = depth / thickness.
     *
     * This makes the hole face forward.
     */
    target.set(
      radial * Math.cos(phi),
      radial * Math.sin(phi),
      windingRadius * Math.sin(theta),
    );

    return target;
  };

  return curve;
}


function ToroidWinding({
  turns,
  majorRadius,
  coreRadius,
  wireRadius,
}: {
  turns: number;
  majorRadius: number;
  coreRadius: number;
  wireRadius: number;
}) {
  const curve = useMemo(
    () =>
      createToroidWindingCurve(
        turns,
        majorRadius,
        coreRadius,
        wireRadius,
      ),
    [
      turns,
      majorRadius,
      coreRadius,
      wireRadius,
    ],
  );

  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        turns * 32,
        wireRadius,
        12,
        false,
      ),
    [
      curve,
      turns,
      wireRadius,
    ],
  );

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#a85f45"
        metalness={0.88}
        roughness={0.20}
      />
    </mesh>
  );
}


export function InductorMesh({
  part,
  selected,
}: {
  part: PlacedPart;
  selected: boolean;
}) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);


  /*
   * =========================================================
   * COMPONENT POSITION
   * =========================================================
   */

  const body = a.clone().lerp(b, 0.5);

  body.y += 0.19;


  /*
   * Direction between PCB pins.
   *
   * We only use this to rotate the component around the
   * vertical axis.
   */
  const direction = b.clone().sub(a);

  direction.y = 0;

  if (direction.lengthSq() < 0.000001) {
    direction.set(1, 0, 0);
  }

  direction.normalize();


  const angle = Math.atan2(
    direction.z,
    direction.x,
  );


  /*
   * =========================================================
   * CORE SIZE
   * =========================================================
   *
   * These proportions are intentionally much closer to the
   * reference image.
   */

  const majorRadius = 0.155;

  const coreRadius = 0.062;


  /*
   * Copper wire thickness.
   */
  const wireRadius = 0.011;


  /*
   * Dense winding like the reference.
   */
  const turns = 18;


  /*
   * =========================================================
   * LEADS
   * =========================================================
   *
   * The leads leave the LOWER portion of the toroid.
   */

  const leadSpacing = 0.070;

  const leadLength = 0.18;


  /*
   * Bottom of the toroid.
   */
  const bottomY =
    -(majorRadius + coreRadius * 0.55);


  /*
   * Local copper exit positions.
   */
  const leftExit = new THREE.Vector3(
    -leadSpacing,
    bottomY,
    0,
  );

  const rightExit = new THREE.Vector3(
    leadSpacing,
    bottomY,
    0,
  );


  /*
   * Bottom of the copper neck.
   */
  const leftLeadEnd =
    leftExit.clone();

  leftLeadEnd.y -= leadLength;


  const rightLeadEnd =
    rightExit.clone();

  rightLeadEnd.y -= leadLength;


  /*
   * Rotate a local point around the vertical axis.
   */
  const rotateLocal = (
    point: THREE.Vector3,
  ) => {
    point.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      angle,
    );

    return body.clone().add(point);
  };


  const leftLeadWorld =
    rotateLocal(
      leftLeadEnd.clone(),
    );

  const rightLeadWorld =
    rotateLocal(
      rightLeadEnd.clone(),
    );


  /*
   * =========================================================
   * COMPONENT
   * =========================================================
   */

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();

        useLab
          .getState()
          .select(part.id);
      }}
    >

      {/* =====================================================
          METAL PCB LEADS
         ===================================================== */}

      <Lead
        from={a}
        to={leftLeadWorld}
      />

      <Lead
        from={b}
        to={rightLeadWorld}
      />


      {/* =====================================================
          VERTICAL TOROID BODY
         ===================================================== */}

      <group
        position={body}
        rotation={[
          0,
          angle,
          0,
        ]}
      >

        {/* ===================================================
            FERRITE CORE

            IMPORTANT:
            NO Math.PI / 2 rotation here.

            THREE.TorusGeometry is already in the XY plane.

            XY = vertical
            Z  = depth

            Therefore the toroid stands like a tire.
           =================================================== */}

        <mesh>
          <torusGeometry
            args={[
              majorRadius,
              coreRadius,
              32,
              72,
            ]}
          />

          <meshStandardMaterial
            color={
              selected
                ? "#7a7f84"
                : "#a99b7c"
            }
            roughness={0.62}
            metalness={0.08}
          />
        </mesh>


        {/* ===================================================
            COPPER WINDING
           =================================================== */}

        <ToroidWinding
          turns={turns}
          majorRadius={majorRadius}
          coreRadius={coreRadius}
          wireRadius={wireRadius}
        />


        {/* ===================================================
            LEFT COPPER NECK
           =================================================== */}

        <mesh
          position={[
            -leadSpacing,
            bottomY -
              leadLength / 2,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              wireRadius,
              wireRadius,
              leadLength,
              12,
            ]}
          />

          <meshStandardMaterial
            color="#a85f45"
            metalness={0.88}
            roughness={0.20}
          />
        </mesh>


        {/* ===================================================
            RIGHT COPPER NECK
           =================================================== */}

        <mesh
          position={[
            leadSpacing,
            bottomY -
              leadLength / 2,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              wireRadius,
              wireRadius,
              leadLength,
              12,
            ]}
          />

          <meshStandardMaterial
            color="#a85f45"
            metalness={0.88}
            roughness={0.20}
          />
        </mesh>


        {/* ===================================================
            LEFT COPPER COLLAR
           =================================================== */}

        <mesh
          position={[
            -leadSpacing,
            bottomY -
              leadLength +
              0.025,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              wireRadius * 1.45,
              wireRadius * 1.45,
              0.035,
              12,
            ]}
          />

          <meshStandardMaterial
            color="#b66a4e"
            metalness={0.82}
            roughness={0.22}
          />
        </mesh>


        {/* ===================================================
            RIGHT COPPER COLLAR
           =================================================== */}

        <mesh
          position={[
            leadSpacing,
            bottomY -
              leadLength +
              0.025,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              wireRadius * 1.45,
              wireRadius * 1.45,
              0.035,
              12,
            ]}
          />

          <meshStandardMaterial
            color="#b66a4e"
            metalness={0.82}
            roughness={0.22}
          />
        </mesh>


        {/* ===================================================
            COPPER TRANSITION PIECES
           =================================================== */}

        <mesh
          position={[
            -leadSpacing,
            bottomY,
            0,
          ]}
        >
          <sphereGeometry
            args={[
              wireRadius * 1.18,
              12,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#a85f45"
            metalness={0.88}
            roughness={0.20}
          />
        </mesh>


        <mesh
          position={[
            leadSpacing,
            bottomY,
            0,
          ]}
        >
          <sphereGeometry
            args={[
              wireRadius * 1.18,
              12,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#a85f45"
            metalness={0.88}
            roughness={0.20}
          />
        </mesh>

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
    <group
      ref={arm}
      position={[-0.16, 0.19, 0.02]}
    >
      {/* Metal switching arm */}
      <mesh position={[0.16, 0, 0]}>
        <boxGeometry args={[0.34, 0.028, 0.045]} />
        <meshStandardMaterial
          color="#cbd5e1"
          metalness={0.9}
          roughness={0.18}
        />
      </mesh>

      {/* Contact tip */}
      <mesh position={[0.31, -0.015, 0]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial
          color="#f1f5f9"
          metalness={0.95}
          roughness={0.12}
        />
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

  const body = pins
    .reduce(
      (sum, pin) => sum.add(pin),
      new THREE.Vector3(),
    )
    .multiplyScalar(1 / pins.length);

  /*
   * Raise the relay above the breadboard.
   */
  body.y += 0.25;

  const active = Boolean(
    sim.relays[part.id]?.on,
  );

  const housingColor = selected
    ? "#26384d"
    : "#111827";

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();

        useLab.getState().select(part.id);
      }}
    >
      {/* ===================================================== */}
      {/* PCB PINS / LEADS                                     */}
      {/* ===================================================== */}

      {pins.map((pin, index) => {
        const pinEnd = new THREE.Vector3(
          pin.x,
          body.y - 0.20,
          pin.z,
        );

        return (
          <group key={`relay-pin-${index}`}>
            <Lead
              from={pin}
              to={pinEnd}
            />

            {/* exposed metal pin */}
            <mesh
              position={[
                pin.x,
                body.y - 0.225,
                pin.z,
              ]}
              castShadow
            >
              <boxGeometry
                args={[0.035, 0.13, 0.035]}
              />

              <meshStandardMaterial
                color="#d4a84f"
                metalness={0.92}
                roughness={0.22}
              />
            </mesh>
          </group>
        );
      })}


      {/* ===================================================== */}
      {/* RELAY BODY                                           */}
      {/* ===================================================== */}

      <group position={body}>

        {/* Lower black mounting base */}
        <mesh
          position={[0, -0.19, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[0.68, 0.08, 0.52]}
          />

          <meshStandardMaterial
            color="#080c12"
            roughness={0.34}
            metalness={0.18}
          />
        </mesh>


        {/* Slightly wider lower lip */}
        <mesh
          position={[0, -0.135, 0]}
          castShadow
        >
          <boxGeometry
            args={[0.72, 0.055, 0.55]}
          />

          <meshStandardMaterial
            color="#0b1118"
            roughness={0.38}
            metalness={0.12}
          />
        </mesh>


        {/* Main relay housing */}
        <mesh
          position={[0, 0.035, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[0.64, 0.37, 0.50]}
          />

          <meshStandardMaterial
            color={housingColor}
            transparent
            opacity={0.94}
            roughness={0.27}
            metalness={0.08}
          />
        </mesh>


        {/* ================================================= */}
        {/* TOP CAP                                            */}
        {/* ================================================= */}

        <mesh
          position={[0, 0.245, 0]}
          castShadow
        >
          <boxGeometry
            args={[0.60, 0.075, 0.47]}
          />

          <meshStandardMaterial
            color={selected ? "#334155" : "#151c25"}
            roughness={0.30}
            metalness={0.10}
          />
        </mesh>


        {/* Top recessed panel */}
        <mesh
          position={[0, 0.286, 0]}
        >
          <boxGeometry
            args={[0.46, 0.012, 0.31]}
          />

          <meshStandardMaterial
            color="#0b1017"
            roughness={0.42}
            metalness={0.08}
          />
        </mesh>


        {/* ================================================= */}
        {/* INTERNAL RELAY AREA                                */}
        {/* ================================================= */}

        <mesh
          position={[-0.13, 0.075, 0.18]}
        >
          <cylinderGeometry
            args={[0.075, 0.075, 0.025, 20]}
          />

          <meshStandardMaterial
            color={active ? "#d97706" : "#3f2a12"}
            metalness={0.65}
            roughness={0.22}
            emissive={
              active
                ? "#92400e"
                : "#000000"
            }
            emissiveIntensity={
              active ? 0.8 : 0
            }
          />
        </mesh>


        {/* Coil center */}
        <mesh
          position={[-0.13, 0.105, 0.18]}
        >
          <cylinderGeometry
            args={[0.052, 0.052, 0.035, 20]}
          />

          <meshStandardMaterial
            color="#b45309"
            metalness={0.75}
            roughness={0.24}
            emissive={
              active
                ? "#f59e0b"
                : "#000000"
            }
            emissiveIntensity={
              active ? 0.7 : 0
            }
          />
        </mesh>


        {/* Switching mechanism */}
        <group
          position={[0, 0, 0]}
          scale={0.9}
        >
          <RelayArm active={active} />
        </group>


        {/* Fixed contact */}
        <mesh
          position={[0.18, 0.19, 0.02]}
        >
          <sphereGeometry
            args={[0.032, 12, 8]}
          />

          <meshStandardMaterial
            color="#d1d5db"
            metalness={0.95}
            roughness={0.12}
          />
        </mesh>


        {/* ================================================= */}
        {/* STATUS INDICATOR                                    */}
        {/* ================================================= */}

        <mesh
          position={[0.235, 0.285, 0.19]}
        >
          <cylinderGeometry
            args={[0.025, 0.025, 0.018, 16]}
          />

          <meshStandardMaterial
            color={
              active
                ? "#4ade80"
                : "#1f2937"
            }
            emissive={
              active
                ? "#22c55e"
                : "#000000"
            }
            emissiveIntensity={
              active ? 2.2 : 0
            }
            metalness={0.2}
            roughness={0.25}
          />
        </mesh>


        {/* ================================================= */}
        {/* TOP RELAY MARKING                                  */}
        {/* ================================================= */}

        <mesh
          position={[0, 0.294, -0.015]}
        >
          <boxGeometry
            args={[0.30, 0.008, 0.055]}
          />

          <meshStandardMaterial
            color="#cbd5e1"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>

        <mesh
          position={[0, 0.294, 0.075]}
        >
          <boxGeometry
            args={[0.22, 0.008, 0.035]}
          />

          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>

      </group>
    </group>
  );
}

 

const POT_MIN_RESISTANCE = 220;
const POT_MAX_RESISTANCE = 10000;

const POT_MIN_ANGLE = -Math.PI * 0.75;
const POT_MAX_ANGLE = Math.PI * 0.75;

function resistanceToPotAngle(resistance: number) {
  const r = THREE.MathUtils.clamp(
    Number(resistance) || POT_MIN_RESISTANCE,
    POT_MIN_RESISTANCE,
    POT_MAX_RESISTANCE,
  );

  const t =
    (r - POT_MIN_RESISTANCE) /
    (POT_MAX_RESISTANCE - POT_MIN_RESISTANCE);

  return THREE.MathUtils.lerp(
    POT_MAX_ANGLE,
    POT_MIN_ANGLE,
    t,
  );
}

function potAngleToResistance(angle: number) {
  const normalized = THREE.MathUtils.clamp(
    (angle - POT_MIN_ANGLE) /
      (POT_MAX_ANGLE - POT_MIN_ANGLE),
    0,
    1,
  );

  const resistance = THREE.MathUtils.lerp(
    POT_MAX_RESISTANCE,
    POT_MIN_RESISTANCE,
    normalized,
  );

  return Math.round(resistance / 10) * 10;
}

function formatResistance(value: number) {
  if (value >= 1000) {
    const k = value / 1000;

    return `${Number.isInteger(k) ? k : k.toFixed(1)}kΩ`;
  }

  return `${Math.round(value)}Ω`;
}

export function PotMesh({
  part,
  selected,
}: {
  part: PlacedPart;
  selected: boolean;
}) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const w = vec(part.pins.w);

  const center = a.clone().lerp(b, 0.5);
  center.y += 0.10;


  const [isDragging, setIsDragging] = useState(false);

  /*
   * ============================================================
   * POTENTIOMETER VALUE
   * ============================================================
   */

  const resistance = THREE.MathUtils.clamp(
    Number(part.props.resistance ?? 1000),
    POT_MIN_RESISTANCE,
    POT_MAX_RESISTANCE,
  );

  /*
   * ============================================================
   * INTERACTION STATE
   * ============================================================
   */

  const shaft = useRef<THREE.Group>(null);

  const dragging = useRef(false);

  const dragStartX = useRef(0);

  const dragStartResistance = useRef(resistance);

  const setPotCameraLock = (locked: boolean) => {
    window.__ecePotDragging = locked;
  };

  /*
   * ============================================================
   * CURRENT POT POSITION
   * ============================================================
   */

  const targetAngle = resistanceToPotAngle(resistance);

  /*
   * ============================================================
   * SMOOTH SHAFT MOVEMENT
   * ============================================================
   */

  useFrame((_, delta) => {
    if (!shaft.current) return;

    shaft.current.rotation.z = THREE.MathUtils.damp(
      shaft.current.rotation.z,
      targetAngle,
      12,
      delta,
    );
  });

  /*
   * ============================================================
   * POINTER DRAG SYSTEM
   * ============================================================
   *
   * Horizontal mouse movement controls the potentiometer.
   *
   * Drag RIGHT  -> resistance increases
   * Drag LEFT   -> resistance decreases
   *
   * This behaves like turning a real rotary control while
   * remaining easy to use inside the 3D circuit lab.
   * ============================================================
   */
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;

      const deltaX =
        event.clientX - dragStartX.current;

      /*
      * Sensitivity.
      *
      * 1 pixel = roughly 25Ω.
      */
      const sensitivity = 25;

      const newResistance = THREE.MathUtils.clamp(
        dragStartResistance.current +
          deltaX * sensitivity,
        POT_MIN_RESISTANCE,
        POT_MAX_RESISTANCE,
      );

      const rounded =
        Math.round(newResistance / 10) * 10;

      /*
      * Update the selected component itself.
      */
      const state = useLab.getState();

      if (state.setSelectedResistance) {
        state.setSelectedResistance(rounded);
      }

      /*
      * Keep the default potentiometer value synchronized.
      */
      if (state.setResistorValue) {
        state.setResistorValue(rounded);
      }
    };

    const handlePointerUp = () => {
      if (!dragging.current) return;

      dragging.current = false;

      setIsDragging(false);

      setPotCameraLock(false);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handlePointerCancel = () => {
      dragging.current = false;

      setIsDragging(false);

      setPotCameraLock(false);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove,
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp,
    );

    window.addEventListener(
      "pointercancel",
      handlePointerCancel,
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove,
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp,
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerCancel,
      );

      setPotCameraLock(false);

      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  /*
   * ============================================================
   * START DRAGGING
   * ============================================================
   */

  const beginPotDrag = (
    e: any,
  ) => {
    e.stopPropagation();

    dragging.current = true;

    dragStartX.current =
      e.clientX ??
      e.nativeEvent?.clientX ??
      0;

    dragStartResistance.current =
      Number(
        part.props.resistance ??
          POT_MIN_RESISTANCE,
      );

    setIsDragging(true);

    // Lock OrbitControls while the potentiometer is being adjusted.
    setPotCameraLock(true);

    document.body.style.cursor =
      "ew-resize";

    document.body.style.userSelect =
      "none";

    useLab.getState().select(part.id);
  };

  /*
   * ============================================================
   * POTENTIOMETER ORIENTATION
   * ============================================================
   */

  const bodyZ = center.z;

  const bodyColor = selected
    ? "#35465a"
    : "#252b30";

  /*
   * ============================================================
   * LEAD CONNECTION POSITIONS
   * ============================================================
   */

  const leadAEnd = new THREE.Vector3(
    a.x,
    center.y - 0.13,
    bodyZ + 0.11,
  );

  const leadWEnd = new THREE.Vector3(
    w.x,
    center.y - 0.13,
    bodyZ + 0.11,
  );

  const leadBEnd = new THREE.Vector3(
    b.x,
    center.y - 0.13,
    bodyZ + 0.11,
  );

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();

        useLab.getState().select(part.id);
      }}
    >

      {/* ======================================================
          ELECTRICAL LEADS
         ====================================================== */}

      <Lead
        from={a}
        to={leadAEnd}
      />

      <Lead
        from={w}
        to={leadWEnd}
      />

      <Lead
        from={b}
        to={leadBEnd}
      />

      {/* ======================================================
          REAR MOUNTING PLATE
         ====================================================== */}

      <group
        position={[
          center.x,
          center.y - 0.06,
          bodyZ + 0.105,
        ]}
      >

        <mesh>
          <boxGeometry
            args={[
              0.31,
              0.25,
              0.035,
            ]}
          />

          <meshStandardMaterial
            color="#a45a32"
            roughness={0.68}
            metalness={0.18}
          />
        </mesh>

        {/* Center support */}

        <mesh
          position={[
            0,
            0.055,
            -0.025,
          ]}
        >
          <cylinderGeometry
            args={[
              0.12,
              0.12,
              0.045,
              32,
            ]}
          />

          <meshStandardMaterial
            color="#a45a32"
            roughness={0.68}
            metalness={0.18}
          />
        </mesh>

        {/* Bottom mounting tab */}

        <mesh
          position={[
            0,
            -0.16,
            0,
          ]}
        >
          <boxGeometry
            args={[
              0.16,
              0.085,
              0.045,
            ]}
          />

          <meshStandardMaterial
            color="#914b29"
            roughness={0.72}
            metalness={0.15}
          />
        </mesh>

        {/* Mounting hole */}

        <mesh
          position={[
            0,
            -0.165,
            -0.025,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.025,
              0.025,
              0.012,
              20,
            ]}
          />

          <meshStandardMaterial
            color="#34383b"
            roughness={0.5}
            metalness={0.7}
          />
        </mesh>
      </group>

      {/* ======================================================
          MAIN POTENTIOMETER BODY
         ====================================================== */}

      <mesh
        position={[
          center.x,
          center.y,
          bodyZ + 0.045,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.125,
            0.125,
            0.105,
            40,
          ]}
        />

        <meshStandardMaterial
          color={bodyColor}
          roughness={0.48}
          metalness={0.38}
        />
      </mesh>

      {/* ======================================================
          BODY FRONT RIM
         ====================================================== */}

      <mesh
        position={[
          center.x,
          center.y,
          bodyZ - 0.015,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.115,
            0.115,
            0.022,
            40,
          ]}
        />

        <meshStandardMaterial
          color="#454b50"
          roughness={0.32}
          metalness={0.75}
        />
      </mesh>

      {/* ======================================================
          FRONT METAL BUSHING
         ====================================================== */}

      <mesh
        position={[
          center.x,
          center.y,
          bodyZ - 0.055,
        ]}
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.078,
            0.078,
            0.045,
            36,
          ]}
        />

        <meshStandardMaterial
          color="#b8bec3"
          roughness={0.25}
          metalness={0.9}
        />
      </mesh>

      {/* ======================================================
          THREADED BUSHING
         ====================================================== */}

      <group
        position={[
          center.x,
          center.y,
          bodyZ - 0.095,
        ]}
      >

        <mesh
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.062,
              0.062,
              0.12,
              32,
            ]}
          />

          <meshStandardMaterial
            color="#b9bec2"
            roughness={0.24}
            metalness={0.94}
          />
        </mesh>

        {/* Threads */}

        {Array.from({
          length: 7,
        }).map((_, i) => (
          <mesh
            key={`pot-thread-${i}`}
            position={[
              0,
              0,
              -0.052 + i * 0.017,
            ]}
            rotation={[
              Math.PI / 2,
              0,
              0,
            ]}
          >
            <torusGeometry
              args={[
                0.063,
                0.0065,
                8,
                32,
              ]}
            />

            <meshStandardMaterial
              color="#969da2"
              roughness={0.22}
              metalness={0.95}
            />
          </mesh>
        ))}

        {/* Washer */}

        <mesh
          position={[
            0,
            0,
            -0.068,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.083,
              0.083,
              0.025,
              40,
            ]}
          />

          <meshStandardMaterial
            color="#c5cacf"
            roughness={0.2}
            metalness={0.95}
          />
        </mesh>
      </group>

      {/* ======================================================
          INTERACTIVE ROTARY SHAFT
         ====================================================== */}

      <group
        ref={shaft}
        position={[
          center.x,
          center.y,
          bodyZ - 0.205,
        ]}
        onPointerDown={beginPotDrag}
        onPointerOver={(e) => {
          e.stopPropagation();

          if (!dragging.current) {
            document.body.style.cursor =
              "grab";
          }
        }}
        onPointerOut={() => {
          if (!dragging.current) {
            document.body.style.cursor =
              "";
          }
        }}
      >

        {/* Main shaft */}

        <mesh
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.035,
              0.035,
              0.30,
              24,
          ]}
          />

          <meshStandardMaterial
            color="#aeb5ba"
            roughness={0.23}
            metalness={0.96}
          />
        </mesh>

        {/* Knurling */}

        {Array.from({
          length: 16,
        }).map((_, i) => {
          const angle =
            (i / 16) *
            Math.PI *
            2;

          const x =
            Math.cos(angle) *
            0.037;

          const y =
            Math.sin(angle) *
            0.037;

          return (
            <mesh
              key={`shaft-knurl-${i}`}
              position={[
                x,
                y,
                0,
              ]}
              rotation={[
                0,
                0,
                angle,
              ]}
            >
              <boxGeometry
                args={[
                  0.006,
                  0.009,
                  0.27,
                ]}
              />

              <meshStandardMaterial
                color="#858c91"
                roughness={0.24}
                metalness={0.95}
              />
            </mesh>
          );
        })}

        {/* Shaft flat */}

        <mesh
          position={[
            0,
            0,
            -0.155,
          ]}
        >
          <boxGeometry
            args={[
              0.047,
              0.012,
              0.12,
            ]}
          />

          <meshStandardMaterial
            color="#777e83"
            roughness={0.24}
            metalness={0.92}
          />
        </mesh>

        {/* Shaft end */}

        <mesh
          position={[
            0,
            0,
            -0.155,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <cylinderGeometry
            args={[
              0.036,
              0.036,
              0.018,
              24,
            ]}
          />

          <meshStandardMaterial
            color="#c0c5c9"
            roughness={0.2}
            metalness={0.96}
          />
        </mesh>
      </group>

      {/* ======================================================
          THREE TERMINALS
         ====================================================== */}

        {[a, w, b].map(
          (pin, index) => (
            <group
              key={`pot-terminal-${index}`}
              position={[
                pin.x,
                center.y - 0.16,
                pin.z,
              ]}
            >

            <mesh>
              <boxGeometry
                args={[
                  0.018,
                  0.075,
                  0.018,
                ]}
              />

              <meshStandardMaterial
                color="#8c9296"
                roughness={0.3}
                metalness={0.9}
              />
            </mesh>

            <mesh
              position={[
                0,
                -0.045,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.025,
                  0.025,
                  0.018,
                  20,
                ]}
              />

              <meshStandardMaterial
                color="#b6bcc0"
                roughness={0.25}
                metalness={0.92}
              />
            </mesh>
          </group>
        ),
      )}

      {/* ======================================================
          SELECTION RING
         ====================================================== */}

      {selected && (
        <mesh
          position={[
            center.x,
            center.y,
            bodyZ - 0.045,
          ]}
          rotation={[
            Math.PI / 2,
            0,
            0,
          ]}
        >
          <torusGeometry
            args={[
              0.132,
              0.009,
              8,
              48,
            ]}
          />

          <meshStandardMaterial
            color="#ffd166"
            emissive="#ffd166"
            emissiveIntensity={
              isDragging
                ? 0.9
                : 0.45
            }
          />
        </mesh>
      )}

      {/* ======================================================
          VALUE DISPLAY
         ====================================================== */}

      {selected && (
        <group
          position={[
            center.x,
            center.y + 0.17,
            bodyZ - 0.03,
          ]}
        >
          <mesh>
            <planeGeometry
              args={[
                0.18,
                0.055,
              ]}
            />

            <meshBasicMaterial
              transparent
              opacity={0.88}
            />
          </mesh>
        </group>
      )}
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
