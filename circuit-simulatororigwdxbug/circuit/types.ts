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
  | "psu-positive"
  | "psu-negative"
  | "delete"
  | "probe"
  | "wire"
  | "resistor"
  | "led"
  | "diode"
  | "switch"
  | "button"
  | "capacitor"
  | "inductor"
  | "buzzer"
  | "relay"
  | "lcd"
  | "mcu"
  | "pot";

export type PartKind =
  | "resistor"
  | "led"
  | "diode"
  | "switch"
  | "button"
  | "capacitor"
  | "inductor"
  | "buzzer"
  | "relay"
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
    capacitance?: number;
    ledColor?: "red" | "green" | "yellow" | "blue";
    closed?: boolean;
    code?: string;
    mcuModel?: "arduino-uno" | "esp32";
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
export interface CapacitorState {
  id: string;
  voltage: number;
  charge: number;
}

export interface BuzzerState {
  id: string;
  on: boolean;
  current: number;
  loudness: number;
}

export interface RelayState {
  id: string;
  on: boolean;
  coilVoltage: number;
}

export interface McuSimState {
  id: string;
  model: "arduino-uno" | "esp32";
  powered: boolean;
  running: boolean;
  digital: Record<string, 0 | 1>;
  pinModes: Record<
    string,
    "INPUT" | "OUTPUT" | "INPUT_PULLUP"
  >;
  error?: string;
}

export interface LcdSimState {
  id: string;
  powered: boolean;
  text: string;
  displayOn: boolean;
  cursorOn: boolean;
  blinkOn: boolean;
  cursorColumn: number;
  cursorRow: number;
}
export interface SimResult {
  ok: boolean;

  error?: string;

  voltages: Record<HoleId, number>;

  stripVoltages: Record<string, number>;

  leds: Record<string, LedState>;

  diodes: Record<string, DiodeState>;

  buzzers: Record<string, BuzzerState>;

  relays: Record<string, RelayState>;

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

export const CAPACITOR_VALUES = [
  { label: "10 pF", value: 10e-12 },
  { label: "22 pF", value: 22e-12 },
  { label: "47 pF", value: 47e-12 },
  { label: "100 pF", value: 100e-12 },

  { label: "220 pF", value: 220e-12 },
  { label: "470 pF", value: 470e-12 },

  { label: "1 nF", value: 1e-9 },
  { label: "2.2 nF", value: 2.2e-9 },
  { label: "4.7 nF", value: 4.7e-9 },
  { label: "10 nF", value: 10e-9 },
  { label: "22 nF", value: 22e-9 },
  { label: "47 nF", value: 47e-9 },
  { label: "100 nF", value: 100e-9 },

  { label: "220 nF", value: 220e-9 },
  { label: "470 nF", value: 470e-9 },

  { label: "1 µF", value: 1e-6 },
  { label: "2.2 µF", value: 2.2e-6 },
  { label: "4.7 µF", value: 4.7e-6 },
  { label: "10 µF", value: 10e-6 },
  { label: "22 µF", value: 22e-6 },
  { label: "47 µF", value: 47e-6 },
  { label: "100 µF", value: 100e-6 },

  { label: "220 µF", value: 220e-6 },
  { label: "470 µF", value: 470e-6 },

  { label: "1000 µF", value: 1000e-6 },
];

