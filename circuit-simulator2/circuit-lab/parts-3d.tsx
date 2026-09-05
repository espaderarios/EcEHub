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
      <meshStandardMaterial color={color} roughness={0.42} metalness={0.08} />
    </mesh>
  );
}

function CurrentFlow({
  a,
  b,
  active,
  color,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  active: boolean;
  color: string;
}) {
  const particles =
    useRef<THREE.Mesh[]>([]);

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

  useFrame(() => {
    if (!active) {
      return;
    }

    const time =
      performance.now() / 1000;

    particles.current.forEach(
      (particle, index) => {
        if (!particle) return;

        const t =
          (
            time * 0.35 +
            index * 0.14
          ) % 1;

        const point =
          curve.getPointAt(t);

        particle.position.copy(
          point,
        );
      },
    );
  });

  if (!active) {
    return null;
  }

  return (
    <>
      {Array.from({
        length: 8,
      }).map((_, index) => (
        <mesh
          key={index}
          ref={(node) => {
            if (node) {
              particles.current[
                index
              ] = node;
            }
          }}
        >
          <sphereGeometry
            args={[
              0.018,
              8,
              8,
            ]}
          />

          <meshBasicMaterial
            color={color}
          />
        </mesh>
      ))}
    </>
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
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[0.0115, 0.0115, len, 10]} />
      <meshStandardMaterial color="#d1d5db" metalness={0.82} roughness={0.18} />
    </mesh>
  );
}

const BAND: Record<number, [string, string, string]> = {
  220: ["#b91c1c", "#b91c1c", "#7c4a1e"],
  330: ["#c2410c", "#c2410c", "#7c4a1e"],
  1000: ["#7c4a1e", "#171717", "#b91c1c"],
  10000: ["#7c4a1e", "#171717", "#c2410c"],
};

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

export function ResistorMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.115;
  const dir = b.clone().sub(a);
  dir.y = 0;
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    dir.clone().normalize(),
  );
  const bands = BAND[part.props.resistance ?? 1000] ?? BAND[1000];
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body.clone().add(new THREE.Vector3(-0.17, 0, 0).applyQuaternion(quat))} />
      <Lead from={b} to={body.clone().add(new THREE.Vector3(0.17, 0, 0).applyQuaternion(quat))} />
      <group position={body} quaternion={quat}>
        {/* More realistic axial resistor body */}
        <mesh castShadow>
          <capsuleGeometry args={[0.048, 0.255, 8, 16]} />
          <meshStandardMaterial
            color={selected ? "#fde68a" : "#c4a574"}
            roughness={0.62}
            metalness={0.04}
          />
        </mesh>
        {/* Sharper color bands */}
        {bands.map((c, i) => (
          <mesh key={c + i} position={[-0.075 + i * 0.055, 0, 0]}>
            <cylinderGeometry args={[0.051, 0.051, 0.017, 16]} />
            <meshStandardMaterial color={c} roughness={0.38} metalness={0.08} />
          </mesh>
        ))}
        {/* Tiny end caps for more realism */}
        <mesh position={[-0.145, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.012, 12]} />
          <meshStandardMaterial color="#9a7b4f" roughness={0.5} />
        </mesh>
        <mesh position={[0.145, 0, 0]}>
          <cylinderGeometry args={[0.042, 0.042, 0.012, 12]} />
          <meshStandardMaterial color="#9a7b4f" roughness={0.5} />
        </mesh>
      </group>
      <PinLabel position={a} label="PIN 1" description="non-polar" />
      <PinLabel position={b} label="PIN 2" description="non-polar" />
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

  const body = a.clone().lerp(k, 0.5);
  body.y += 0.155;

  const color = LED_HEX[part.props.ledColor ?? "red"];
  const state = sim.leds[part.id];
  const brightness = state?.brightness ?? 0;
  const isOn = Boolean(state?.on);
  const glow = isOn ? 1.6 + brightness * 5.5 : 0;

  // Real LEDs have a slightly longer anode lead
  const anodeTip = body.clone();
  anodeTip.y -= 0.01;
  const cathodeTip = body.clone();
  cathodeTip.y -= 0.025;

  return (
    <group
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      {/* ANODE LEAD (longer) */}
      <Lead from={a} to={anodeTip} />

      {/* CATHODE LEAD (shorter) */}
      <Lead from={k} to={cathodeTip} />

      {/* ANODE TERMINAL (red) */}
      <mesh position={[a.x, a.y + 0.04, a.z]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={1.2}
          metalness={0.3}
          roughness={0.35}
        />
      </mesh>

      {/* CATHODE TERMINAL (dark) */}
      <mesh position={[k.x, k.y + 0.04, k.z]}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.55}
          roughness={0.28}
        />
      </mesh>

      {/* LED DOME – more realistic 5 mm epoxy shape */}
      <mesh
        position={[body.x, body.y + 0.015, body.z]}
        scale={selected ? [1.12, 1.12, 1.12] : [1, 1, 1]}
      >
        <sphereGeometry args={[0.088, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
        <meshStandardMaterial
          color={selected ? "#ffffff" : color}
          emissive={color}
          emissiveIntensity={glow}
          roughness={0.07}
          metalness={0.02}
          transparent
          opacity={0.93}
        />
      </mesh>

      {/* Internal reflector cup */}
      <mesh position={[body.x, body.y - 0.018, body.z]}>
        <cylinderGeometry args={[0.052, 0.068, 0.028, 20]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.55} roughness={0.22} />
      </mesh>

      {/* LED flange / base */}
      <mesh position={[body.x, body.y - 0.052, body.z]}>
        <cylinderGeometry args={[0.076, 0.08, 0.042, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.32} />
      </mesh>

      {/* GLOW + point light when on */}
      {isOn ? (
        <>
          <pointLight
            position={[body.x, body.y + 0.05, body.z]}
            color={color}
            intensity={2.2 + brightness * 8}
            distance={2.8}
            decay={2}
          />
          <mesh position={[body.x, body.y + 0.01, body.z]}>
            <sphereGeometry args={[0.17 + brightness * 0.13, 20, 20]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.04 + brightness * 0.11}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : null}

      {/* POLARITY — HOVER ONLY */}
      {hovered && (
        <>
          <PinLabel position={a} label="ANODE" polarity="+" description="positive" />
          <PinLabel position={k} label="CATHODE" polarity="-" description="negative" />
        </>
      )}

      {/* COMPONENT NAME */}
      <Html position={[body.x, body.y + 0.3, body.z]} center distanceFactor={5}>
        <div
          style={{
            color: "#f8fafc",
            fontSize: "10px",
            fontWeight: 900,
            textShadow: "0 2px 6px #000",
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
}: {
  part: PlacedPart;
  selected: boolean;
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
            color="#ef4444"
          />
        </mesh>
      </group>

     {/* POLARITY — HOVER ONLY */}

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

export function SwitchMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.08;
  const closed = Boolean(part.props.closed);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().toggleSwitch(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />
      <mesh position={body}>
        <boxGeometry args={[0.28, 0.08, 0.18]} />
        <meshStandardMaterial color={selected ? "#64748b" : "#2a3344"} />
      </mesh>
      <mesh position={[body.x + (closed ? 0.05 : -0.05), body.y + 0.07, body.z]}>
        <boxGeometry args={[0.12, 0.06, 0.1]} />
        <meshStandardMaterial color={closed ? "#0f766e" : "#94a3b8"} />
      </mesh>
    </group>
  );
}

export function CapacitorMesh({ part, selected }: { part: PlacedPart; selected: boolean }) {
  const a = vec(part.pins.a);
  const b = vec(part.pins.b);
  const body = a.clone().lerp(b, 0.5);
  body.y += 0.155;
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        useLab.getState().select(part.id);
      }}
    >
      <Lead from={a} to={body} />
      <Lead from={b} to={body} />

      {/* Main electrolytic can */}
      <mesh position={body} castShadow>
        <cylinderGeometry args={[0.078, 0.078, 0.28, 24]} />
        <meshStandardMaterial
          color={selected ? "#1e3a5f" : "#1e40af"}
          roughness={0.32}
          metalness={0.12}
        />
      </mesh>

      {/* Top plastic disc */}
      <mesh position={[body.x, body.y + 0.145, body.z]}>
        <cylinderGeometry args={[0.08, 0.08, 0.018, 24]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.28} roughness={0.4} />
      </mesh>

      {/* Subtle polarity stripe on the side */}
      <mesh position={[body.x + 0.072, body.y, body.z]}>
        <boxGeometry args={[0.01, 0.22, 0.01]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>

      {/* Bottom ring for a bit more depth */}
      <mesh position={[body.x, body.y - 0.135, body.z]}>
        <cylinderGeometry args={[0.079, 0.079, 0.012, 20]} />
        <meshStandardMaterial color="#0f172a" metalness={0.2} roughness={0.45} />
      </mesh>

      <PinLabel position={a} label="PIN 1" description="non-polar" />
      <PinLabel position={b} label="PIN 2" description="non-polar" />
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
  const p1 = vec(part.pins.p1 ?? part.pins.gnd);
  const p8 = vec(part.pins.p8 ?? part.pins.gnd);
  const cx = (p1.x + p8.x) / 2;
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
      <mesh position={[cx, 0.42, 0]} castShadow>
        <boxGeometry args={[width, 0.16, 0.78]} />
        <meshStandardMaterial color={selected ? "#334155" : "#111827"} roughness={0.45} />
      </mesh>
      <mesh position={[p1.x + 0.08, 0.51, -0.28]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[cx, 0.51, 0.22]}>
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
  const cx = (origin.x + last.x) / 2 + 0.35;
  const cz = origin.z + 0.55;

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
      <mesh position={[body.x, body.y + 0.08, body.z]}>
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
      return (<DiodeMesh part={part} selected={selected} />);
    case "led":
      return <LedMesh part={part} selected={selected} sim={sim} />;
    case "switch":
      return <SwitchMesh part={part} selected={selected} />;
    case "capacitor":
      return <CapacitorMesh part={part} selected={selected} />;
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

export function PowerSupply() {
  const voltage = useLab((s) => s.psuVoltage);
  const powerOn = useLab((s) => s.powerOn);
  const pos = useLab((s) => s.psuPositive);
  const neg = useLab((s) => s.psuNegative);
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
      </group>
      <TubeWire a={jackRed} b={destPos} color="#c2413b" lift={1.4} radius={0.035} />
      <TubeWire a={jackBlk} b={destNeg} color="#1a1d23" lift={1.4} radius={0.035} />
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
      {/* Main board body – slightly warmer plastic */}
      <mesh position={[0, 0.17, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.7, 0.34, 5.7]} />
        <meshStandardMaterial color="#f8f5ee" roughness={0.78} metalness={0.02} />
      </mesh>

      {/* Power rail stripes */}
      <mesh position={[0, 0.345, -2.5]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#c2413b" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.345, -2.2]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.345, 2.2]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.345, 2.5]}>
        <boxGeometry args={[6.4, 0.012, 0.06]} />
        <meshStandardMaterial color="#c2413b" roughness={0.4} />
      </mesh>

      {/* Center divider strip */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[6.55, 0.08, 0.42]} />
        <meshStandardMaterial color="#ebe6dc" roughness={0.7} />
      </mesh>

      {/* Slightly recessed, darker holes */}
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
        <cylinderGeometry args={[0.037, 0.034, 0.11, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}
