import { ALL_HOLES, holeStrip } from "./breadboard";
import type { HoleId, PlacedPart, SimResult, Wire } from "./types";

const GMIN = 1e-9;
const LED_VF: Record<string, number> = {
  red: 1.8,
  green: 2.1,
  yellow: 2.0,
  blue: 2.9,
};
const DIODE_VF = 0.7;
const DIODE_RD = 8;
const DIODE_MAX_MA = 100;
const LED_RD = 18;
const LED_MAX_MA = 25;

class UnionFind {
  parent = new Map<string, string>();
  find(x: string) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    const p = this.parent.get(x)!;
    if (p !== x) this.parent.set(x, this.find(p));
    return this.parent.get(x)!;
  }
  union(a: string, b: string) {
    const pa = this.find(a);
    const pb = this.find(b);
    if (pa !== pb) this.parent.set(pa, pb);
  }
}

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) continue;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const div = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    if (Math.abs(M[i][i]) < 1e-10) {
      if (Math.abs(M[i][n]) > 1e-6) return null;
      x[i] = 0;
    } else {
      x[i] = M[i][n];
    }
  }
  return x;
}

function pinHole(part: PlacedPart, name: string): HoleId | undefined {
  return part.pins[name];
}

export function simulate(input: {
  parts: PlacedPart[];
  wires: Wire[];
  powerOn: boolean;
  psuVoltage: number;
  psuPositive: HoleId | null;
  psuNegative: HoleId | null;
}): SimResult {
  const empty: SimResult = {
    ok: true,
    voltages: {},
    stripVoltages: {},
    leds: {},
    supplyCurrent: 0,
    lcdPowered: false,
    lcdText: "",
    mcuPowered: false,
    warnings: [],
  };

  if (!input.powerOn) return empty;
  if (!input.psuPositive || !input.psuNegative) {
    return { ...empty, ok: false, error: "Clip both PSU probes onto the breadboard." };
  }

  const uf = new UnionFind();
  for (const hole of ALL_HOLES) uf.find(holeStrip(hole));
  for (const w of input.wires) uf.union(holeStrip(w.a), holeStrip(w.b));
  for (const part of input.parts) {
    if (part.kind === "switch" && part.props.closed) {
      const a = pinHole(part, "a");
      const b = pinHole(part, "b");
      if (a && b) uf.union(holeStrip(a), holeStrip(b));
    }
    if (part.kind === "pot") {
      const a = pinHole(part, "a");
      const w = pinHole(part, "w");
      const b = pinHole(part, "b");
      if (a && w) uf.union(holeStrip(a), holeStrip(w));
      if (b && w) {
        /* wiper treated as mid via two resistors below */
      }
    }
  }

  const posStrip = uf.find(holeStrip(input.psuPositive));
  const gndStrip = uf.find(holeStrip(input.psuNegative));
  if (posStrip === gndStrip) {
    return { ...empty, ok: false, error: "Short circuit: the supply probes are connected together." };
  }

  const strips = new Set<string>();
  for (const hole of ALL_HOLES) strips.add(uf.find(holeStrip(hole)));
  const nodes = [...strips].filter((s) => s !== gndStrip);
  const idx = new Map<string, number>();
  nodes.forEach((s, i) => idx.set(s, i));
  const n = nodes.length;
  const indexOf = (strip: string) => (strip === gndStrip ? -1 : (idx.get(strip) ?? -2));

  const leds = input.parts.filter((p) => p.kind === "led");
  const diodes = input.parts.filter(
    (p) => p.kind === "diode"
  );

  const diodeOn = diodes.map(() => false);
  const ledOn = leds.map(() => false);
  let lastX: number[] | null = null;
  let supplyCurrent = 0;
  const warnings: string[] = [];

  for (let iter = 0; iter < 8; iter++) {
    const N = n + 1;
    const A = Array.from({ length: N }, () => Array(N).fill(0));
    const b = Array(N).fill(0);
    for (let i = 0; i < n; i++) A[i][i] += GMIN;

    const stampR = (sa: string, sb: string, r: number) => {
      const g = 1 / Math.max(r, 1e-6);
      const i = indexOf(uf.find(sa));
      const j = indexOf(uf.find(sb));
      if (i === -2 || j === -2) return;
      if (i >= 0) A[i][i] += g;
      if (j >= 0) A[j][j] += g;
      if (i >= 0 && j >= 0) {
        A[i][j] -= g;
        A[j][i] -= g;
      }
    };

    for (const part of input.parts) {
      if (part.kind === "resistor") {
        const a = pinHole(part, "a");
        const bpin = pinHole(part, "b");
        if (a && bpin) stampR(holeStrip(a), holeStrip(bpin), part.props.resistance ?? 1000);
      }
      if (part.kind === "capacitor") {
        const a = pinHole(part, "a");
        const bpin = pinHole(part, "b");
        if (a && bpin) stampR(holeStrip(a), holeStrip(bpin), 2e7);
      }
      if (part.kind === "pot") {
        const a = pinHole(part, "a");
        const w = pinHole(part, "w");
        const bp = pinHole(part, "b");
        const r = part.props.resistance ?? 10000;
        if (a && w) stampR(holeStrip(a), holeStrip(w), r / 2);
        if (bp && w) stampR(holeStrip(bp), holeStrip(w), r / 2);
      }
    }

    leds.forEach((led, li) => {
      const a = pinHole(led, "a");
      const k = pinHole(led, "k");
      if (!a || !k) return;
      const vf = LED_VF[led.props.ledColor ?? "red"] ?? 1.8;
      const sa = uf.find(holeStrip(a));
      const sk = uf.find(holeStrip(k));
      const i = indexOf(sa);
      const j = indexOf(sk);
      if (ledOn[li]) {
        const g = 1 / LED_RD;
        if (i >= 0) A[i][i] += g;
        if (j >= 0) A[j][j] += g;
        if (i >= 0 && j >= 0) {
          A[i][j] -= g;
          A[j][i] -= g;
        }
        if (i >= 0) b[i] += g * vf;
        if (j >= 0) b[j] -= g * vf;
      } else {
        stampR(holeStrip(a), holeStrip(k), 5e7);
      }
    });

    const ip = indexOf(posStrip);
    const vs = n;
    if (ip >= 0) {
      A[ip][vs] += 1;
      A[vs][ip] += 1;
    }
    b[vs] = input.psuVoltage;

    const x = solve(A, b);
    if (!x) {
      return { ...empty, ok: false, error: "The solver could not find a stable solution." };
    }
    lastX = x;
    supplyCurrent = x[vs] ?? 0;

    let changed = false;
    leds.forEach((led, li) => {
      const a = pinHole(led, "a");
      const k = pinHole(led, "k");
      if (!a || !k) return;
      const va = voltageOf(uf.find(holeStrip(a)), gndStrip, idx, x);
      const vk = voltageOf(uf.find(holeStrip(k)), gndStrip, idx, x);
      const vf = LED_VF[led.props.ledColor ?? "red"] ?? 1.8;
      const next = va - vk > vf * 0.65;
      if (next !== ledOn[li]) {
        ledOn[li] = next;
        changed = true;
      }
    });
    if (!changed) break;
  }

  const x = lastX ?? [];
  const stripVoltages: Record<string, number> = {};
  for (const s of strips) stripVoltages[s] = voltageOf(s, gndStrip, idx, x);

  const voltages: Record<HoleId, number> = {};
  for (const hole of ALL_HOLES) voltages[hole] = stripVoltages[uf.find(holeStrip(hole))] ?? 0;

  const ledStates: SimResult["leds"] = {};
  leds.forEach((led, li) => {
    const a = pinHole(led, "a");
    const k = pinHole(led, "k");
    if (!a || !k) return;
    const va = voltages[a] ?? 0;
    const vk = voltages[k] ?? 0;
    const vf = LED_VF[led.props.ledColor ?? "red"] ?? 1.8;
    const current = ledOn[li] ? Math.max(0, (va - vk - vf) / LED_RD) : 0;
    const ma = current * 1000;
    const overcurrent = ma > LED_MAX_MA;
    if (overcurrent) warnings.push(`${led.props.ledColor ?? "red"} LED is overcurrent (${ma.toFixed(0)} mA). Add a series resistor.`);
    ledStates[led.id] = {
      id: led.id,
      on: ledOn[li] && current > 0.0004,
      current,
      brightness: Math.max(0, Math.min(1, ma / 12)),
      overcurrent,
    };
  });

  const vAt = (part: PlacedPart, name: string) => {
    const h = pinHole(part, name);
    return h ? (voltages[h] ?? 0) : 0;
  };

  let lcdPowered = false;
  let mcuPowered = false;
  for (const part of input.parts) {
    if (part.kind === "lcd") {
      const vdd = vAt(part, "vdd");
      const vss = vAt(part, "vss");
      if (vdd - vss > 3.5) lcdPowered = true;
    }
    if (part.kind === "mcu") {
      const vcc = vAt(part, "vcc");
      const gnd = vAt(part, "gnd");
      if (vcc - gnd > 3.5) mcuPowered = true;
    }
  }

  if (Math.abs(supplyCurrent) > 0.5) {
    warnings.push("Supply current is very high — check for a short.");
  }

  return {
    ok: true,
    voltages,
    stripVoltages,
    leds: ledStates,
    supplyCurrent,
    lcdPowered,
    lcdText: lcdPowered && mcuPowered ? "Hello, World!" : lcdPowered ? "" : "",
    mcuPowered,
    warnings,
  };
}

function voltageOf(
  strip: string,
  gnd: string,
  idx: Map<string, number>,
  x: number[],
) {
  if (strip === gnd) return 0;
  const i = idx.get(strip);
  if (i === undefined) return 0;
  return x[i] ?? 0;
}
