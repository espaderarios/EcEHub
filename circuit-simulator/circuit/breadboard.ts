import {
  PITCH,
  ROWS,
  type HoleId,
  type RailKind,
  type RowLetter,
} from "./types";

/** Built-in breadboard size / style presets. */
export type BoardPresetId =
  | "mini-170"
  | "half-400"
  | "standard-830"
  | "full-1660"
  | "mb-102";

export interface BoardPreset {
  id: BoardPresetId;
  label: string;
  description: string;
  /** Number of terminal strips (columns). */
  cols: number;
  /** Include top/bottom power rails. */
  hasRails: boolean;
  /** How many columns share one continuous rail segment before a break. */
  railSegment: number;
}

export const BOARD_PRESETS: BoardPreset[] = [
  {
    id: "mini-170",
    label: "Mini 170",
    description: "Compact 17-column board, no power rails",
    cols: 17,
    hasRails: false,
    railSegment: 17,
  },
  {
    id: "half-400",
    label: "Half-size 400",
    description: "15 columns with power rails (≈400 tie-points)",
    cols: 15,
    hasRails: true,
    railSegment: 15,
  },
  {
    id: "standard-830",
    label: "Standard 830",
    description: "30 columns, dual power rails (classic solderless)",
    cols: 30,
    hasRails: true,
    railSegment: 15,
  },
  {
    id: "mb-102",
    label: "MB-102",
    description: "830-point board, continuous rails option",
    cols: 30,
    hasRails: true,
    railSegment: 30,
  },
  {
    id: "full-1660",
    label: "Full / double 1660",
    description: "60 columns — large project board",
    cols: 60,
    hasRails: true,
    railSegment: 15,
  },
];

export function getBoardPreset(id: BoardPresetId): BoardPreset {
  return BOARD_PRESETS.find((p) => p.id === id) ?? BOARD_PRESETS[2];
}

let activePreset: BoardPreset = getBoardPreset("standard-830");

/** Mutable board dimensions — updated when the user switches presets. */
export const BOARD = {
  width: activePreset.cols * PITCH + 0.7,
  depth: 5.7,
  height: 0.34,
  y: 0.17,
  cols: activePreset.cols,
  hasRails: activePreset.hasRails,
  railSegment: activePreset.railSegment,
  presetId: activePreset.id as BoardPresetId,
};

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

function rebuildBoardMetrics() {
  BOARD.width = activePreset.cols * PITCH + 0.7;
  BOARD.depth = 5.7;
  BOARD.height = 0.34;
  BOARD.y = 0.17;
  BOARD.cols = activePreset.cols;
  BOARD.hasRails = activePreset.hasRails;
  BOARD.railSegment = activePreset.railSegment;
  BOARD.presetId = activePreset.id;
}

export function getActiveBoardPreset(): BoardPreset {
  return activePreset;
}

/** Switch the active breadboard geometry. Clears cached hole list. */
export function setBoardPreset(id: BoardPresetId) {
  activePreset = getBoardPreset(id);
  rebuildBoardMetrics();
  cachedHoles = null;
}

export function colX(col: number) {
  return (col - (BOARD.cols + 1) / 2) * PITCH;
}

export function holePosition(id: HoleId): [number, number, number] {
  const y = BOARD.height + 0.01;
  if (
    id.startsWith("tp") ||
    id.startsWith("tn") ||
    id.startsWith("bp") ||
    id.startsWith("bn")
  ) {
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
  for (let c = 1; c <= BOARD.cols; c++) {
    if (BOARD.hasRails) {
      holes.push(`tp${c}`, `tn${c}`, `bp${c}`, `bn${c}`);
    }
    for (const row of ROWS) holes.push(`${row}${c}`);
  }
  return holes;
}

let cachedHoles: HoleId[] | null = null;

/** Live hole list for the active board (recomputed after preset changes). */
export function getAllHoles(): HoleId[] {
  if (!cachedHoles) cachedHoles = allHoles();
  return cachedHoles;
}

/** @deprecated Prefer getAllHoles() so board switches stay live. */
export const ALL_HOLES = allHoles();

export function holeStrip(id: HoleId): string {
  if (
    id.startsWith("tp") ||
    id.startsWith("tn") ||
    id.startsWith("bp") ||
    id.startsWith("bn")
  ) {
    const kind = id.slice(0, 2);
    const col = Number(id.slice(2));
    const seg = BOARD.railSegment;
    const segmentIndex = Math.floor((col - 1) / seg);
    return `${kind}S${segmentIndex}`;
  }
  const row = id[0];
  const col = Number(id.slice(1));
  if ("ABCDE".includes(row)) return `T${col}`;
  return `B${col}`;
}

export function isHoleId(value: string): value is HoleId {
  return getAllHoles().includes(value);
}

export function nearestHole(
  point: { x: number; y: number; z: number },
  maxDist = 0.14,
): HoleId | null {
  let best: HoleId | null = null;
  let bestD = maxDist;
  for (const id of getAllHoles()) {
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

/** Parse a terminal-strip hole like "E12" → { row, col }. */
export function parseTerminalHole(
  id: HoleId,
): { row: RowLetter; col: number } | null {
  if (!/^[A-J]\d+$/.test(id)) return null;
  return { row: id[0] as RowLetter, col: Number(id.slice(1)) };
}

/**
 * Build a hole id in the same half of the board, offset by columns.
 * Clamps to valid column range.
 */
export function offsetHole(
  id: HoleId,
  colDelta: number,
  row?: RowLetter,
): HoleId | null {
  const parsed = parseTerminalHole(id);
  if (!parsed) return null;
  const col = Math.min(
    BOARD.cols,
    Math.max(1, parsed.col + colDelta),
  );
  const r = row ?? parsed.row;
  return `${r}${col}`;
}
