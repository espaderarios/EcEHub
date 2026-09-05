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
  ledColor: NonNullable<PlacedPart["props"]["ledColor"]>;

  pendingHole: HoleId | null;
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

    case "capacitor":
      return "capacitor";

    default:
      return null;
  }
}

export const useLab = create<LabState>((set, get) => ({
  tool: "select",

  wireColor: "red",

  resistorValue: 1000,

  ledColor: "red",

  pendingHole: null,

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
    }),

  setWireColor: (wireColor) =>
    set({
      wireColor,
    }),

  setResistorValue: (resistorValue) =>
    set({
      resistorValue,
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
    }),

  select: (selectedId) =>
    set({
      selectedId,
      pendingHole: null,
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
          part.kind !== "resistor"
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
      });

      return;
    }

    /*
     * TWO-PIN COMPONENTS
     */
    const kind = getTwoPinKind(state.tool);

    if (!kind) {
      return;
    }

    /*
     * FIRST CLICK
     */
    if (!state.pendingHole) {
      set({
        pendingHole: hole,
      });

      return;
    }

    /*
     * CANCEL IF SAME HOLE
     */
    if (state.pendingHole === hole) {
      set({
        pendingHole: null,
      });

      return;
    }

    /*
     * WIRE
     */
    if (kind === "wire") {
      if (
        holeStrip(state.pendingHole) ===
        holeStrip(hole)
      ) {
        set({
          pendingHole: null,
        });

        return;
      }

      const wire: Wire = {
        id: uid("wire"),

        a: state.pendingHole,

        b: hole,

        color: state.wireColor,
      };

      const wires = [
        ...state.wires,
        wire,
      ];

      const next = {
        ...state,
        wires,
      };

      set({
        wires,

        pendingHole: null,

        sim: runSimulation(next),

        history: [
          ...state.history,
          snapshot(state),
        ],

        future: [],
      });

      return;
    }

    /*
     * COMPONENT
     */

/*
 * COMPONENT
 */

const pins: Record<string, HoleId> =
  kind === "led" || kind === "diode"
    ? {
        a: state.pendingHole,
        k: hole,
      }
    : {
        a: state.pendingHole,
        b: hole,
      };

const part: PlacedPart = {
  id: uid(kind),

  kind,

  pins,

  props: {
    resistance:
      kind === "resistor"
        ? state.resistorValue
        : undefined,

    ledColor:
      kind === "led"
        ? state.ledColor
        : undefined,

    closed:
      kind === "switch"
        ? false
        : undefined,

    label:
      kind === "diode"
        ? "D1"
        : undefined,
  },
};

    const parts = [
      ...state.parts,
      part,
    ];

    const next = {
      ...state,
      parts,
    };

    set({
      parts,

      pendingHole: null,

      selectedId: part.id,

      sim: runSimulation(next),

      history: [
        ...state.history,
        snapshot(state),
      ],

      future: [],

      tool: "select",
    });
  },
}));