export const COLS = 30;
export const PITCH = 0.2;

export const ROWS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
] as const;

export type RowLetter = (typeof ROWS)[number];

export type RailKind =
  | "tp"
  | "tn"
  | "bp"
  | "bn";

export type HoleId = string;

export type ToolId =
  | "select"
  | "delete"
  | "probe"
  | "wire"
  | "resistor"
  | "led"
  | "diode"
  | "switch"
  | "capacitor"
  | "lcd"
  | "mcu"
  | "pot";

export type PartKind =
  | "resistor"
  | "led"
  | "diode"
  | "switch"
  | "capacitor"
  | "lcd"
  | "mcu"
  | "pot";

export type WireColor =
  | "red"
  | "black"
  | "blue"
  | "orange"
  | "green"
  | "yellow"
  | "white";

export interface PlacedPart {
  id: string;

  kind: PartKind;

  pins: Record<string, HoleId>;

  props: {
    resistance?: number;

    ledColor?:
      | "red"
      | "green"
      | "yellow"
      | "blue";

    closed?: boolean;

    label?: string;
  };
}

export interface Wire {
  id: string;
  a: HoleId;
  b: HoleId;
  color: WireColor;
}

export interface LedState {
  id: string;
  on: boolean;
  current: number;
  brightness: number;
  overcurrent: boolean;
}

export interface DiodeState {
  id: string;
  on: boolean;
  current: number;
  forwardVoltage: number;
}

export interface SimResult {
  ok: boolean;

  error?: string;

  voltages: Record<HoleId, number>;

  stripVoltages: Record<string, number>;

  leds: Record<string, LedState>;

  diodes: Record<string, DiodeState>;

  supplyCurrent: number;

  lcdPowered: boolean;

  lcdText: string;

  mcuPowered: boolean;

  warnings: string[];
}

export const WIRE_HEX: Record<
  WireColor,
  string
> = {
  red: "#c2413b",
  black: "#1a1d23",
  blue: "#1d4ed8",
  orange: "#c2410c",
  green: "#047857",
  yellow: "#ca8a04",
  white: "#e8eef8",
};

export const LED_HEX: Record<
  NonNullable<
    PlacedPart["props"]["ledColor"]
  >,
  string
> = {
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#38bdf8",
};

export const RESISTOR_VALUES = [
  220,
  330,
  1000,
  10000,
] as const;