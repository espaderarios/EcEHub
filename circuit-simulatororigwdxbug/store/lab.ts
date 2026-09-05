import { create } from "zustand";
import { holeStrip } from "@/circuit/breadboard";
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

  history: LabSnapshot[];
  future: LabSnapshot[];

  setCapacitorValue: (value: number) => void;
  setSelectedCapacitance: (value: number) => void;

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

  setHover: (hole: HoleId | null) => void;
  clickHole: (hole: HoleId) => void;
  select: (id: string | null) => void;

  togglePower: () => void;
  setVoltage: (voltage: number) => void;
  toggleSwitch: (id: string) => void;

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
  }

  if (tool === "pot") return { kind: "pot" as const, pins: ["a", "w", "b"] };
  if (tool === "relay") {
    return { kind: "relay" as const, pins: ["coilA", "coilB", "com", "no"] };
  }

  return null;
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

  psuPositive: initialPreset.psuPositive,

  psuNegative: initialPreset.psuNegative,

  sim: simulate({
    parts: initialPreset.parts,

    wires: initialPreset.wires,

    powerOn: true,

    psuVoltage: 5,

    psuPositive: initialPreset.psuPositive,

    psuNegative: initialPreset.psuNegative,
  }),

  labId: initialPreset.id,

  history: [],

  future: [],

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

      const next = {
        ...state,
        powerOn,
      };

      return {
        powerOn,
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

  toggleSwitch: (id) =>
    set((state) => {
      const parts = state.parts.map((part) => {
        if (
          part.id !== id ||
          (part.kind !== "switch" && part.kind !== "button")
        ) {
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
              placement.kind === "mcu"
                ? "arduino-uno"
                : undefined,

            code:
              placement.kind === "mcu"
                ? `#include <LiquidCrystal.h>

            LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

            void setup() {
              lcd.begin(16, 2);
              lcd.print("Hello, world!");
            }

            void loop() {
            }
            `
                : undefined,
        label:
          placement.kind === "diode"
            ? "D1"
            : placement.kind === "relay"
              ? "K1"
              : placement.kind === "buzzer"
                ? "BZ1"
                : undefined,
      },
    };

    const parts = [...state.parts, part];
    const next = { ...state, parts };
    set({
      parts,
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
