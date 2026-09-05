import { create } from "zustand";
import {
  BOARD,
  holeStrip,
  offsetHole,
  parseTerminalHole,
  setBoardPreset,
  type BoardPresetId,
} from "@/circuit/breadboard";
import { helloWorldPreset, type LabPreset } from "@/circuit/presets";
import { simulate } from "@/circuit/simulate";
import type {
  HoleId,
  PartKind,
  PlacedPart,
  SimResult,
  ToolId,
  Wire,
  WireColor,
} from "@/circuit/types";
import { uid } from "@/lib/utils";

interface LabSnapshot {
  parts: PlacedPart[];
  wires: Wire[];
  psuPositive: HoleId | null;
  psuNegative: HoleId | null;
}

interface LabState {
  tool: ToolId;
  wireColor: WireColor;

  resistorValue: number;
  capacitorValue: number;

  ledColor: NonNullable<PlacedPart["props"]["ledColor"]>;

  pendingHole: HoleId | null;
  pendingHoles: HoleId[];
  hoverHole: HoleId | null;

  selectedId: string | null;
  probeHole: HoleId | null;

  parts: PlacedPart[];
  wires: Wire[];

  powerOn: boolean;
  psuVoltage: number;

  psuPositive: HoleId | null;
  psuNegative: HoleId | null;

  sim: SimResult;

  labId: string;

  /** Active breadboard size / style preset. */
  boardId: BoardPresetId;

  history: LabSnapshot[];
  future: LabSnapshot[];

  setCapacitorValue: (value: number) => void;
  setSelectedCapacitance: (value: number) => void;

  setBoard: (id: BoardPresetId) => void;
  /**
   * Place a component in one gesture starting at `anchor` hole.
   * Multi-pin parts fan out across adjacent columns automatically.
   */
  placePartAt: (tool: ToolId, anchor: HoleId) => void;

  setTool: (tool: ToolId) => void;
  setWireColor: (color: WireColor) => void;

  setResistorValue: (value: number) => void;

  setLedColor: (
    color: NonNullable<PlacedPart["props"]["ledColor"]>
  ) => void;

  setSelectedResistance: (value: number) => void;

  setSelectedLedColor: (
    color: NonNullable<PlacedPart["props"]["ledColor"]>
  ) => void;

  setSelectedLabel: (label: string) => void;
  /** Update sketch on the selected MCU. */
  setSelectedCode: (code: string) => void;
  /** Update sketch on a specific MCU by id. */
  setMcuCode: (id: string, code: string) => void;

  setHover: (hole: HoleId | null) => void;
  clickHole: (hole: HoleId) => void;
  select: (id: string | null) => void;

  togglePower: () => void;
  setVoltage: (voltage: number) => void;
  toggleSwitch: (id: string) => void;
  /** Momentary push-button: true while held, false on release. */
  setButtonPressed: (id: string, pressed: boolean) => void;

  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;

  loadPreset: (preset: LabPreset) => void;
  clearBoard: () => void;
  resetPending: () => void;
}

const initialPreset = {
  id: "free",
  parts: [],
  wires: [],
  psuPositive: null,
  psuNegative: null,
};

export interface McuProgram {
  language: "arduino";
  code: string;
}

export interface PlacedPart {
  id: string;
  kind: PartKind;

  pins: Record<string, HoleId>;

  props: {
    resistance?: number;
    capacitance?: number;

    ledColor?:
      | "red"
      | "green"
      | "yellow"
      | "blue";

    closed?: boolean;

    label?: string;

    mcuModel?: "arduino-uno" | "esp32";

    code?: string;
  };
}

function snapshot(state: LabState): LabSnapshot {
  return {
    parts: state.parts.map((p) => ({
      ...p,
      pins: { ...p.pins },
      props: { ...p.props },
    })),

    wires: state.wires.map((w) => ({ ...w })),

    psuPositive: state.psuPositive,

    psuNegative: state.psuNegative,
  };
}

function runSimulation(state: {
  parts: PlacedPart[];
  wires: Wire[];
  powerOn: boolean;
  psuVoltage: number;
  psuPositive: HoleId | null;
  psuNegative: HoleId | null;
}) {
  return simulate(state);
}

function getTwoPinKind(tool: ToolId): PartKind | "wire" | null {
  switch (tool) {
    case "wire":
      return "wire";

    case "resistor":
      return "resistor";

    case "led":
      return "led";

    case "diode":
      return "diode";

    case "switch":
      return "switch";

    case "button":
      return "button";

    case "capacitor":
      return "capacitor";

    case "inductor":
      return "inductor";

    case "buzzer":
      return "buzzer";

    case "lcd":
      return "lcd";

    case "oled":
      return "oled";

    case "mcu":
      return "mcu";

    default:
      return null;
  }
}

function getPlacement(tool: ToolId) {
  const kind = getTwoPinKind(tool);
  if (kind) {
    if (kind === "wire") return { kind, pins: ["a", "b"] };
    if (kind === "led" || kind === "diode") return { kind, pins: ["a", "k"] };
    if (kind === "lcd") {
      return {
        kind,
        pins: [
          "vss",
          "vdd",
          "v0",
          "rs",
          "rw",
          "e",
          "d0",
          "d1",
          "d2",
          "d3",
          "d4",
          "d5",
          "d6",
          "d7",
          "a",
          "k",
        ],
      };
    }
    if (kind === "oled") {
      return {
        kind,
        pins: ["vcc", "gnd", "sda", "scl"],
      };
    }
    if (kind === "mcu") {
      return {
        kind,
        pins: [
          "vcc",
          "gnd",
          "d0",
          "d1",
          "d2",
          "d3",
          "d4",
          "d5",
          "d6",
          "d7",
          "d8",
          "d9",
          "d10",
          "d11",
          "d12",
          "d13",
          "a0",
          "a1",
          "a2",
          "a3",
          "a4",
          "a5",
        ],
      };
    }
    // All other two-terminal parts (resistor, switch, button, capacitor, …)
    return { kind, pins: ["a", "b"] };
  }

  if (tool === "pot") return { kind: "pot" as const, pins: ["a", "w", "b"] };
  if (tool === "relay") {
    return { kind: "relay" as const, pins: ["coilA", "coilB", "com", "no"] };
  }

  return null;
}

/** Default Arduino sketch (matches auto-wire pin map below). */
export const DEFAULT_MCU_CODE = `#include <LiquidCrystal.h>

// RS, E, D4, D5, D6, D7
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);
  lcd.print("Hello, world!");
}

void loop() {
}
`;

/**
 * Wire MCU ↔ LCD to match LiquidCrystal lcd(12, 11, 5, 4, 3, 2)
 * plus power / backlight / RW→GND.
 */
function autoWireMcuLcd(
  mcu: PlacedPart,
  lcd: PlacedPart,
  existing: Wire[],
): Wire[] {
  const pairs: Array<{
    a?: HoleId;
    b?: HoleId;
    color: WireColor;
  }> = [
    { a: mcu.pins.d12, b: lcd.pins.rs, color: "blue" },
    { a: mcu.pins.d11, b: lcd.pins.e, color: "blue" },
    { a: mcu.pins.d5, b: lcd.pins.d4, color: "green" },
    { a: mcu.pins.d4, b: lcd.pins.d5, color: "green" },
    { a: mcu.pins.d3, b: lcd.pins.d6, color: "green" },
    { a: mcu.pins.d2, b: lcd.pins.d7, color: "green" },
    { a: mcu.pins.vcc, b: lcd.pins.vdd, color: "red" },
    { a: mcu.pins.gnd, b: lcd.pins.vss, color: "black" },
    { a: mcu.pins.gnd, b: lcd.pins.rw, color: "black" },
    { a: mcu.pins.vcc, b: lcd.pins.a, color: "orange" },
    { a: mcu.pins.gnd, b: lcd.pins.k, color: "black" },
  ];

  const wires = [...existing];
  const hasLink = (a: HoleId, b: HoleId) =>
    wires.some(
      (w) =>
        (w.a === a && w.b === b) || (w.a === b && w.b === a),
    );

  for (const { a, b, color } of pairs) {
    if (!a || !b) continue;
    if (a === b) continue;
    if (hasLink(a, b)) continue;
    wires.push({ id: uid("wire"), a, b, color });
  }
  return wires;
}


function autoWireMcuOled(
  mcu: PlacedPart,
  oled: PlacedPart,
  existing: Wire[],
): Wire[] {
  // Uno I2C: SDA = A4, SCL = A5
  const pairs: Array<{ a?: string; b?: string; color: WireColor }> = [
    { a: mcu.pins.vcc, b: oled.pins.vcc, color: "red" },
    { a: mcu.pins.gnd, b: oled.pins.gnd, color: "black" },
    { a: mcu.pins.a4 ?? mcu.pins.sda, b: oled.pins.sda, color: "blue" },
    { a: mcu.pins.a5 ?? mcu.pins.scl, b: oled.pins.scl, color: "yellow" },
  ];
  const wires = [...existing];
  const hasLink = (a: string, b: string) =>
    wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
  for (const { a, b, color } of pairs) {
    if (!a || !b || a === b || hasLink(a, b)) continue;
    wires.push({ id: uid("wire"), a, b, color });
  }
  return wires;
}


/** Default bench rails when the user has not clipped the PSU yet. */
function defaultPowerRails(): { pos: HoleId; neg: HoleId } {
  if (!BOARD.hasRails) {
    return { pos: "A1", neg: "J1" };
  }
  return { pos: "tp1", neg: "tn1" };
}

/**
 * Ensure PSU clips exist and MCU VCC/GND (and LCD/OLED power) reach them.
 */
function ensurePowerWiring(
  state: {
    parts: PlacedPart[];
    wires: Wire[];
    psuPositive: HoleId | null;
    psuNegative: HoleId | null;
  },
): {
  wires: Wire[];
  psuPositive: HoleId;
  psuNegative: HoleId;
} {
  const rails = defaultPowerRails();
  const psuPositive = state.psuPositive ?? rails.pos;
  const psuNegative = state.psuNegative ?? rails.neg;
  let wires = [...state.wires];

  const hasLink = (a: HoleId, b: HoleId) =>
    wires.some(
      (w) => (w.a === a && w.b === b) || (w.a === b && w.b === a),
    );
  const link = (a: HoleId | undefined, b: HoleId | undefined, color: WireColor) => {
    if (!a || !b || a === b || hasLink(a, b)) return;
    wires.push({ id: uid("wire"), a, b, color });
  };

  if (BOARD.hasRails) {
    // Bridge left/right rail segments and top↔bottom buses
    for (const prefix of ["tp", "bp"] as const) {
      link(`${prefix}1` as HoleId, `${prefix}16` as HoleId, "red");
    }
    for (const prefix of ["tn", "bn"] as const) {
      link(`${prefix}1` as HoleId, `${prefix}16` as HoleId, "black");
    }
    link("tn1", "bn1", "black");
    link("tp1", "bp1", "red");
  }

  for (const part of state.parts) {
    if (part.kind === "mcu") {
      link(part.pins.vcc, psuPositive, "red");
      link(part.pins.gnd, psuNegative, "black");
    }
    if (part.kind === "lcd") {
      link(part.pins.vdd, psuPositive, "red");
      link(part.pins.vss, psuNegative, "black");
      link(part.pins.a, psuPositive, "orange");
      link(part.pins.k, psuNegative, "black");
      link(part.pins.rw, psuNegative, "black");
    }
    if (part.kind === "oled") {
      link(part.pins.vcc, psuPositive, "red");
      link(part.pins.gnd, psuNegative, "black");
    }
  }

  return { wires, psuPositive, psuNegative };
}

export const useLab = create<LabState>((set, get) => ({

  tool: "select",

  wireColor: "red",

  resistorValue: 1000,

  // Default capacitor = 10 µF
  capacitorValue: 10e-6,

  ledColor: "red",

  pendingHole: null,

  pendingHoles: [],

  hoverHole: null,

  selectedId: null,

  probeHole: null,

  parts: initialPreset.parts,

  wires: initialPreset.wires,

  powerOn: true,

  psuVoltage: 5,

  psuPositive: "tp1",

  psuNegative: "tn1",

  sim: simulate({
    parts: initialPreset.parts,

    wires: initialPreset.wires,

    powerOn: true,

    psuVoltage: 5,

    psuPositive: "tp1",

    psuNegative: "tn1",
  }),

  labId: initialPreset.id,

  boardId: "standard-830",

  history: [],

  future: [],

  setBoard: (id) => {
    const state = get();
    setBoardPreset(id);
    // Changing geometry invalidates existing placements — clear the bench.
    set({
      boardId: id,
      parts: [],
      wires: [],
      psuPositive: null,
      psuNegative: null,
      pendingHole: null,
      pendingHoles: [],
      selectedId: null,
      probeHole: null,
      history: [...state.history, snapshot(state)],
      future: [],
      sim: runSimulation({
        parts: [],
        wires: [],
        powerOn: state.powerOn,
        psuVoltage: state.psuVoltage,
        psuPositive: null,
        psuNegative: null,
      }),
    });
  },

  placePartAt: (tool, anchor) => {
    const state = get();
    const placement = getPlacement(tool);
    if (!placement) return;

    const parsed = parseTerminalHole(anchor);
    if (!parsed && placement.kind !== "wire") {
      // Anchor must be a terminal strip hole for components.
      return;
    }

    // Map pin names → holes by walking across adjacent columns.
    const holes: HoleId[] = [];
    if (placement.kind === "wire") {
      holes.push(anchor);
      const next = offsetHole(anchor, 1) ?? anchor;
      holes.push(next);
    } else if (placement.pins.length === 2) {
      holes.push(anchor);
      const b =
        offsetHole(anchor, placement.kind === "led" || placement.kind === "diode" ? 0 : 3) ??
        anchor;
      // LEDs/diodes: a and k on same column different rows when possible
      if (placement.kind === "led" || placement.kind === "diode") {
        const row = parsed!.row;
        const opposite =
          "ABCDE".includes(row)
            ? (`F${parsed!.col}` as HoleId)
            : (`E${parsed!.col}` as HoleId);
        holes.push(opposite);
      } else {
        holes.push(b === anchor ? (offsetHole(anchor, 1) ?? anchor) : b);
      }
    } else {
      // Multi-pin: sequential columns on the same row.
      for (let i = 0; i < placement.pins.length; i++) {
        const h = offsetHole(anchor, i) ?? anchor;
        holes.push(h);
      }
    }

    if (placement.kind === "wire") {
      const [a, b] = holes;
      if (a === b || holeStrip(a) === holeStrip(b)) return;
      const wire: Wire = {
        id: uid("wire"),
        a,
        b,
        color: state.wireColor,
      };
      const wires = [...state.wires, wire];
      const next = { ...state, wires };
      set({
        wires,
        pendingHole: null,
        pendingHoles: [],
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
        tool: "select",
      });
      return;
    }

    const pins = Object.fromEntries(
      placement.pins.map((name, index) => [name, holes[index] ?? anchor]),
    ) as Record<string, HoleId>;

    const part: PlacedPart = {
      id: uid(placement.kind),
      kind: placement.kind,
      pins,
      props: {
        resistance:
          placement.kind === "resistor" || placement.kind === "pot"
            ? state.resistorValue
            : undefined,
        capacitance:
          placement.kind === "capacitor" ? state.capacitorValue : undefined,
        ledColor: placement.kind === "led" ? state.ledColor : undefined,
        closed:
          placement.kind === "switch" || placement.kind === "button"
            ? false
            : undefined,
        mcuModel: placement.kind === "mcu" ? "arduino-uno" : undefined,
        code: placement.kind === "mcu" ? DEFAULT_MCU_CODE : undefined,
        label:
          placement.kind === "diode"
            ? "D1"
            : placement.kind === "relay"
              ? "K1"
              : placement.kind === "buzzer"
                ? "BZ1"
                : placement.kind === "lcd"
                  ? "LCD 16x2"
                  : placement.kind === "oled"
                    ? "OLED 128x64"
                    : placement.kind === "mcu"
                      ? "Arduino Uno"
                      : undefined,
      },
    };

    let parts = [...state.parts, part];
    let wires = state.wires;

    // Auto-connect MCU ↔ LCD / OLED when both are on the board.
    if (
      placement.kind === "mcu" ||
      placement.kind === "lcd" ||
      placement.kind === "oled"
    ) {
      const mcu =
        placement.kind === "mcu"
          ? part
          : parts.find((p) => p.kind === "mcu");
      const lcd =
        placement.kind === "lcd"
          ? part
          : parts.find((p) => p.kind === "lcd");
      const oled =
        placement.kind === "oled"
          ? part
          : parts.find((p) => p.kind === "oled");
      if (mcu && lcd) {
        wires = autoWireMcuLcd(mcu, lcd, wires);
      }
      if (mcu && oled) {
        wires = autoWireMcuOled(mcu, oled, wires);
      }
    }

    const powered = ensurePowerWiring({
      parts,
      wires,
      psuPositive: state.psuPositive,
      psuNegative: state.psuNegative,
    });
    wires = powered.wires;

    const next = {
      ...state,
      parts,
      wires,
      psuPositive: powered.psuPositive,
      psuNegative: powered.psuNegative,
    };
    set({
      parts,
      wires,
      psuPositive: powered.psuPositive,
      psuNegative: powered.psuNegative,
      pendingHole: null,
      pendingHoles: [],
      selectedId: part.id,
      sim: runSimulation(next),
      history: [...state.history, snapshot(state)],
      future: [],
      tool: "select",
    });
  },

  setTool: (tool) =>
    set({
      tool,
      pendingHole: null,
      pendingHoles: [],
    }),

  setWireColor: (wireColor) =>
    set({
      wireColor,
    }),

  setResistorValue: (resistorValue) =>
    set({
      resistorValue,
    }),

  setCapacitorValue: (capacitorValue) =>
    set({
      capacitorValue,
    }),

  setLedColor: (ledColor) =>
    set({
      ledColor,
    }),

  setHover: (hoverHole) =>
    set({
      hoverHole,
    }),

  resetPending: () =>
    set({
      pendingHole: null,
      pendingHoles: [],
    }),

  select: (selectedId) =>
    set({
      selectedId,
      pendingHole: null,
      pendingHoles: [],
    }),

  togglePower: () =>
    set((state) => {
      const powerOn = !state.powerOn;
      const powered = ensurePowerWiring(state);
      const next = {
        ...state,
        powerOn,
        wires: powered.wires,
        psuPositive: powered.psuPositive,
        psuNegative: powered.psuNegative,
      };

      return {
        powerOn,
        wires: powered.wires,
        psuPositive: powered.psuPositive,
        psuNegative: powered.psuNegative,
        sim: runSimulation(next),
      };
    }),

  setVoltage: (psuVoltage) =>
    set((state) => {
      const next = {
        ...state,
        psuVoltage,
      };

      return {
        psuVoltage,
        sim: runSimulation(next),
      };
    }),

  setSelectedResistance: (resistance) =>
    set((state) => {
      if (!state.selectedId) return state;

      const parts = state.parts.map((part) => {
        if (
          part.id !== state.selectedId ||
          (part.kind !== "resistor" && part.kind !== "pot")
        ) {
          return part;
        }

        return {
          ...part,
          props: {
            ...part.props,
            resistance,
          },
        };
      });

      const next = {
        ...state,
        parts,
      };

      return {
        parts,
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

setSelectedCapacitance: (capacitance) =>
  set((state) => {
    if (!state.selectedId) {
      return state;
    }

    const parts = state.parts.map((part) => {
      if (
        part.id !== state.selectedId ||
        part.kind !== "capacitor"
      ) {
        return part;
      }

      return {
        ...part,
        props: {
          ...part.props,
          capacitance,
        },
      };
    });

    const next = {
      ...state,
      parts,
    };

    return {
      parts,
      sim: runSimulation(next),
      history: [
        ...state.history,
        snapshot(state),
      ],
      future: [],
    };
  }),

  setSelectedLedColor: (ledColor) =>
    set((state) => {
      if (!state.selectedId) return state;

      const parts = state.parts.map((part) => {
        if (
          part.id !== state.selectedId ||
          part.kind !== "led"
        ) {
          return part;
        }

        return {
          ...part,
          props: {
            ...part.props,
            ledColor,
          },
        };
      });

      const next = {
        ...state,
        parts,
      };

      return {
        parts,
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

  setSelectedLabel: (label) =>
    set((state) => {
      if (!state.selectedId) return state;

      const parts = state.parts.map((part) =>
        part.id === state.selectedId
          ? {
              ...part,
              props: {
                ...part.props,
                label,
              },
            }
          : part
      );

      return {
        parts,
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

  setSelectedCode: (code) =>
    set((state) => {
      if (!state.selectedId) return state;
      const parts = state.parts.map((part) => {
        if (part.id !== state.selectedId || part.kind !== "mcu") {
          return part;
        }
        return {
          ...part,
          props: {
            ...part.props,
            code,
          },
        };
      });
      const next = { ...state, parts };
      return {
        parts,
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

  setMcuCode: (id, code) =>
    set((state) => {
      const parts = state.parts.map((part) => {
        if (part.id !== id || part.kind !== "mcu") return part;
        return {
          ...part,
          props: { ...part.props, code },
        };
      });
      const powered = ensurePowerWiring({
        parts,
        wires: state.wires,
        psuPositive: state.psuPositive,
        psuNegative: state.psuNegative,
      });
      const next = {
        ...state,
        parts,
        wires: powered.wires,
        psuPositive: powered.psuPositive,
        psuNegative: powered.psuNegative,
      };
      return {
        parts,
        wires: powered.wires,
        psuPositive: powered.psuPositive,
        psuNegative: powered.psuNegative,
        selectedId: id,
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

  toggleSwitch: (id) =>
    set((state) => {
      // Toggle only for maintained switches — not momentary buttons.
      const parts = state.parts.map((part) => {
        if (part.id !== id || part.kind !== "switch") {
          return part;
        }

        return {
          ...part,
          props: {
            ...part.props,
            closed: !part.props.closed,
          },
        };
      });

      const next = {
        ...state,
        parts,
      };

      return {
        parts,
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      };
    }),

  setButtonPressed: (id, pressed) =>
    set((state) => {
      const parts = state.parts.map((part) => {
        if (part.id !== id || part.kind !== "button") {
          return part;
        }
        if (Boolean(part.props.closed) === pressed) {
          return part;
        }
        return {
          ...part,
          props: {
            ...part.props,
            closed: pressed,
          },
        };
      });
      const next = { ...state, parts };
      return {
        parts,
        sim: runSimulation(next),
        // No history for momentary press/release — avoids undo spam
      };
    }),

  loadPreset: (preset) =>
    set((state) => {
      const next = {
        ...state,

        parts: preset.parts.map((p) => ({
          ...p,
          pins: { ...p.pins },
          props: { ...p.props },
        })),

        wires: preset.wires.map((w) => ({ ...w })),

        psuPositive: preset.psuPositive,

        psuNegative: preset.psuNegative,

        labId: preset.id,

        pendingHole: null,

        pendingHoles: [],

        selectedId: null,

        probeHole: null,
      };

      return {
        ...next,

        sim: runSimulation(next),

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      };
    }),

  clearBoard: () =>
    set((state) => {
      const next = {
        ...state,

        parts: [],

        wires: [],

        psuPositive: null,

        psuNegative: null,

        pendingHole: null,

        pendingHoles: [],

        selectedId: null,

        probeHole: null,

        labId: "free",
      };

      return {
        ...next,

        sim: runSimulation(next),

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      };
    }),

  deleteSelected: () =>
    set((state) => {
      if (!state.selectedId) return state;

      const parts = state.parts.filter(
        (part) => part.id !== state.selectedId
      );

      const wires = state.wires.filter(
        (wire) => wire.id !== state.selectedId
      );

      const next = {
        ...state,
        parts,
        wires,
        selectedId: null,
      };

      return {
        parts,
        wires,
        selectedId: null,

        sim: runSimulation(next),

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      };
    }),

  undo: () =>
    set((state) => {
      const previous =
        state.history[state.history.length - 1];

      if (!previous) return state;

      const next = {
        ...state,
        ...previous,
      };

      return {
        ...previous,

        sim: runSimulation(next),

        history: state.history.slice(0, -1),

        future: [
          snapshot(state),
          ...state.future,
        ],

        pendingHole: null,
        pendingHoles: [],
      };
    }),

  redo: () =>
    set((state) => {
      const nextHistory = state.future[0];

      if (!nextHistory) return state;

      const next = {
        ...state,
        ...nextHistory,
      };

      return {
        ...nextHistory,

        sim: runSimulation(next),

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: state.future.slice(1),

        pendingHole: null,
        pendingHoles: [],
      };
    }),

  clickHole: (hole) => {
    const state = get();

    /*
     * VOLTMETER
     */
    if (state.tool === "probe") {
      set({
        probeHole: hole,
        selectedId: null,
        pendingHole: null,
        pendingHoles: [],
      });

      return;
    }

    /*
     * POWER SUPPLY POSITIVE
     */
    if (state.tool === "psu-positive") {
      const next = {
        ...state,
        psuPositive: hole,
      };

      set({
        psuPositive: hole,

        sim: runSimulation(next),

        pendingHole: null,

        pendingHoles: [],

        tool: "select",

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      });

      return;
    }

    /*
     * POWER SUPPLY NEGATIVE
     */
    if (state.tool === "psu-negative") {
      const next = {
        ...state,
        psuNegative: hole,
      };

      set({
        psuNegative: hole,

        sim: runSimulation(next),

        pendingHole: null,

        pendingHoles: [],

        tool: "select",

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      });

      return;
    }

    /*
     * SELECT / PROBE
     */
    if (state.tool === "select") {
      set({
        probeHole: hole,
        selectedId: null,
        pendingHole: null,
        pendingHoles: [],
      });

      return;
    }

    const placement = getPlacement(state.tool);
    if (!placement) return;

    // Components with three or four terminals (potentiometers and relays)
    // use the same direct placement flow as two-terminal parts.
    if (state.pendingHoles.includes(hole)) {
      set({ pendingHole: null, pendingHoles: [] });
      return;
    }

    const holes = [...state.pendingHoles, hole];
    if (holes.length < placement.pins.length) {
      set({ pendingHole: holes[0], pendingHoles: holes });
      return;
    }

    if (placement.kind === "wire") {
      const [a, b] = holes;
      if (holeStrip(a) === holeStrip(b)) {
        set({ pendingHole: null, pendingHoles: [] });
        return;
      }

      const wire: Wire = { id: uid("wire"), a, b, color: state.wireColor };
      const wires = [...state.wires, wire];
      const next = { ...state, wires };
      set({
        wires,
        pendingHole: null,
        pendingHoles: [],
        sim: runSimulation(next),
        history: [...state.history, snapshot(state)],
        future: [],
      });
      return;
    }

    const pins = Object.fromEntries(
      placement.pins.map((name, index) => [name, holes[index]]),
    ) as Record<string, HoleId>;
    const part: PlacedPart = {
      id: uid(placement.kind),
      kind: placement.kind,
      pins,
      props: {
        resistance:
          placement.kind === "resistor" || placement.kind === "pot"
            ? state.resistorValue
            : undefined,

        capacitance:
          placement.kind === "capacitor"
            ? state.capacitorValue
            : undefined,
        ledColor: placement.kind === "led" ? state.ledColor : undefined,
        closed:
          placement.kind === "switch" || placement.kind === "button"
            ? false
            : undefined,
        mcuModel:
          placement.kind === "mcu" ? "arduino-uno" : undefined,
        code: placement.kind === "mcu" ? DEFAULT_MCU_CODE : undefined,
        label:
          placement.kind === "diode"
            ? "D1"
            : placement.kind === "relay"
              ? "K1"
              : placement.kind === "buzzer"
                ? "BZ1"
                : placement.kind === "lcd"
                  ? "LCD 16x2"
                  : placement.kind === "oled"
                    ? "OLED 128x64"
                    : placement.kind === "mcu"
                      ? "Arduino Uno"
                      : undefined,
      },
    };

    let parts = [...state.parts, part];
    let wires = state.wires;

    if (
      placement.kind === "mcu" ||
      placement.kind === "lcd" ||
      placement.kind === "oled"
    ) {
      const mcu =
        placement.kind === "mcu"
          ? part
          : parts.find((p) => p.kind === "mcu");
      const lcd =
        placement.kind === "lcd"
          ? part
          : parts.find((p) => p.kind === "lcd");
      const oled =
        placement.kind === "oled"
          ? part
          : parts.find((p) => p.kind === "oled");
      if (mcu && lcd) {
        wires = autoWireMcuLcd(mcu, lcd, wires);
      }
      if (mcu && oled) {
        wires = autoWireMcuOled(mcu, oled, wires);
      }
    }

    const powered = ensurePowerWiring({
      parts,
      wires,
      psuPositive: state.psuPositive,
      psuNegative: state.psuNegative,
    });
    wires = powered.wires;

    const next = {
      ...state,
      parts,
      wires,
      psuPositive: powered.psuPositive,
      psuNegative: powered.psuNegative,
    };
    set({
      parts,
      wires,
      psuPositive: powered.psuPositive,
      psuNegative: powered.psuNegative,
      pendingHole: null,
      pendingHoles: [],
      selectedId: part.id,
      sim: runSimulation(next),
      history: [...state.history, snapshot(state)],
      future: [],
      tool: "select",
    });
  },
}));
