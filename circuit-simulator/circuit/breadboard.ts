import { COLS, PITCH, ROWS, type HoleId, type RailKind, type RowLetter } from "./types";

const RAIL_Z: Record<RailKind, number> = {
  tp: -2.62,
  tn: -2.38,
  bp: 2.38,
  bn: 2.62,
};

const ROW_Z: Record<RowLetter, number> = {
  A: -1.78,
  B: -1.58,
  C: -1.38,
  D: -1.18,
  E: -1.0,
  F: 1.0,
  G: 1.18,
  H: 1.38,
  I: 1.58,
  J: 1.78,
};

export const BOARD = {
  width: COLS * PITCH + 0.7,
  depth: 5.7,
  height: 0.34,
  y: 0.17,
};

export function colX(col: number) {
  return (col - (COLS + 1) / 2) * PITCH;
}

export function holePosition(id: HoleId): [number, number, number] {
  const y = BOARD.height + 0.01;
  if (id.startsWith("tp") || id.startsWith("tn") || id.startsWith("bp") || id.startsWith("bn")) {
    const kind = id.slice(0, 2) as RailKind;
    const col = Number(id.slice(2));
    return [colX(col), y, RAIL_Z[kind]];
  }
  const row = id[0] as RowLetter;
  const col = Number(id.slice(1));
  return [colX(col), y, ROW_Z[row]];
}

export function allHoles(): HoleId[] {
  const holes: HoleId[] = [];
  for (let c = 1; c <= COLS; c++) {
    holes.push(`tp${c}`, `tn${c}`, `bp${c}`, `bn${c}`);
    for (const row of ROWS) holes.push(`${row}${c}`);
  }
  return holes;
}

export const ALL_HOLES = allHoles();

export function holeStrip(id: HoleId): string {
  if (id.startsWith("tp") || id.startsWith("tn") || id.startsWith("bp") || id.startsWith("bn")) {
    const kind = id.slice(0, 2);
    const col = Number(id.slice(2));
    const half = col <= 15 ? "L" : "R";
    return `${kind}${half}`;
  }
  const row = id[0];
  const col = Number(id.slice(1));
  if ("ABCDE".includes(row)) return `T${col}`;
  return `B${col}`;
}

export function isHoleId(value: string): value is HoleId {
  return ALL_HOLES.includes(value);
}

export function nearestHole(point: { x: number; y: number; z: number }, maxDist = 0.14): HoleId | null {
  let best: HoleId | null = null;
  let bestD = maxDist;
  for (const id of ALL_HOLES) {
    const [x, , z] = holePosition(id);
    const d = Math.hypot(point.x - x, point.z - z);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export function pinLabel(kind: string, name: string) {
  return `${kind}.${name}`;
}
