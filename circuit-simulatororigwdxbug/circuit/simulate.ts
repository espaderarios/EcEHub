import { ALL_HOLES, holeStrip } from "./breadboard";
import type { HoleId, PlacedPart, SimResult, Wire } from "./types";
import {
  executeMcuProgram,
  type McuRuntimeState,
} from "./mcu-runtime";
import {
  createHd44780,
  clockHd44780,
  lcdText,
  type Hd44780Pins,
  type Hd44780State,
} from "./hd44780";


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

function digitalValue(
  state: McuRuntimeState,
  pin: string | undefined,
): 0 | 1 {
  if (!pin) return 0;

  return state.digital[pin] ?? 0;
}

function lcdPinsFromMcu(
  lcd: PlacedPart,
  mcu: PlacedPart,
  mcuState: McuRuntimeState,
  uf: UnionFind,
): Hd44780Pins {
  const connectedValue = (
    lcdPin: string,
  ): 0 | 1 => {
    const lcdHole = pinHole(lcd, lcdPin);

    if (!lcdHole) return 0;

    const lcdNet = uf.find(
      holeStrip(lcdHole),
    );

    /*
     * Find the MCU GPIO connected to this LCD pin.
     */
    for (const [pinName, hole] of Object.entries(
      mcu.pins,
    )) {
      if (
        !pinName.startsWith("d") ||
        !/^d\d+$/i.test(pinName)
      ) {
        continue;
      }

      if (
        uf.find(holeStrip(hole)) === lcdNet
      ) {
        return digitalValue(
          mcuState,
          pinName.toLowerCase(),
        );
      }
    }

    return 0;
  };

  return {
    rs: connectedValue("rs"),
    rw: connectedValue("rw"),
    e: connectedValue("e"),

    d4: connectedValue("d4"),
    d5: connectedValue("d5"),
    d6: connectedValue("d6"),
    d7: connectedValue("d7"),
  };
}


export function simulate(input: {
  parts: PlacedPart[];
  wires: Wire[];
  powerOn: boolean;
  psuVoltage: number;
  psuPositive: HoleId | null;
  psuNegative: HoleId | null;
}): SimResult {
  // ============================================================
  // EMPTY / SAFE RESULT
  // ============================================================

  const empty: SimResult = {
    voltages: {},
    currents: {},
    leds: {},
    diodes: {},
    switches: {},
    buttons: {},
    capacitors: {},
    inductors: {},
    buzzers: {},

    // New MCU / LCD runtime state
    mcus: {},
    lcds: {},

    // Backwards-compatible fields
    lcdPowered: false,
    lcdText: "",
    mcuPowered: false,
  };

  if (!input.powerOn) {
    return empty;
  }

  // ============================================================
  // BUILD ELECTRICAL NETS
  // ============================================================

  const uf = new UnionFind(ALL_HOLES.length);

  const indexOf = new Map<HoleId, number>();

  ALL_HOLES.forEach((hole, index) => {
    indexOf.set(hole, index);
  });

  function union(a: HoleId | undefined, b: HoleId | undefined) {
    if (!a || !b) return;

    const ia = indexOf.get(a);
    const ib = indexOf.get(b);

    if (ia === undefined || ib === undefined) return;

    uf.union(ia, ib);
  }

  // ============================================================
  // BREADBOARD INTERNAL CONNECTIONS
  // ============================================================

  for (const strip of holeStrip) {
    for (let i = 1; i < strip.length; i++) {
      union(strip[0], strip[i]);
    }
  }

  // ============================================================
  // WIRES
  // ============================================================

  for (const wire of input.wires) {
    union(wire.a, wire.b);
  }

  // ============================================================
  // CLOSED SWITCHES / BUTTONS
  // ============================================================

  for (const part of input.parts) {
    if (part.kind === "switch" && part.props.closed) {
      union(part.pins.a, part.pins.b);
    }

    if (part.kind === "button" && part.props.closed) {
      union(part.pins.a, part.pins.b);
    }
  }

  // ============================================================
  // POWER SUPPLY
  // ============================================================

  const positiveNode =
    input.psuPositive
      ? uf.find(indexOf.get(input.psuPositive) ?? 0)
      : null;

  const negativeNode =
    input.psuNegative
      ? uf.find(indexOf.get(input.psuNegative) ?? 0)
      : null;

  // ============================================================
  // NODE LIST
  // ============================================================

  const nodes = new Set<number>();

  for (const hole of ALL_HOLES) {
    const index = indexOf.get(hole);

    if (index === undefined) continue;

    nodes.add(uf.find(index));
  }

  const nodeList = Array.from(nodes);

  // ============================================================
  // NODE VOLTAGES
  // ============================================================

  const voltages: Record<string, number> = {};

  // Start everything at 0 V.
  for (const hole of ALL_HOLES) {
    voltages[hole] = 0;
  }

  // ============================================================
  // BUILD DC ELEMENTS
  // ============================================================

  const elements: Array<{
    a: number;
    b: number;
    resistance: number;
    id: string;
  }> = [];

  for (const part of input.parts) {
    // ----------------------------------------------------------
    // RESISTOR
    // ----------------------------------------------------------

    if (part.kind === "resistor") {
      const a = part.pins.a;
      const b = part.pins.b;

      if (!a || !b) continue;

      const ia = indexOf.get(a);
      const ib = indexOf.get(b);

      if (ia === undefined || ib === undefined) continue;

      elements.push({
        a: uf.find(ia),
        b: uf.find(ib),
        resistance: Math.max(
          0.001,
          part.props.resistance ?? 1000,
        ),
        id: part.id,
      });
    }

    // ----------------------------------------------------------
    // POTENTIOMETER
    // ----------------------------------------------------------

    if (part.kind === "pot") {
      const a = part.pins.a;
      const b = part.pins.b;
      const w = part.pins.w;

      if (!a || !b || !w) continue;

      const ia = indexOf.get(a);
      const ib = indexOf.get(b);
      const iw = indexOf.get(w);

      if (
        ia === undefined ||
        ib === undefined ||
        iw === undefined
      ) {
        continue;
      }

      const total =
        Math.max(
          1,
          part.props.resistance ?? 10000,
        );

      // Keep the existing simulator's simple potentiometer model.
      elements.push({
        a: uf.find(ia),
        b: uf.find(iw),
        resistance: total / 2,
        id: `${part.id}:aw`,
      });

      elements.push({
        a: uf.find(iw),
        b: uf.find(ib),
        resistance: total / 2,
        id: `${part.id}:wb`,
      });
    }

    // ----------------------------------------------------------
    // LED
    // ----------------------------------------------------------

    if (part.kind === "led") {
      const a = part.pins.a;
      const k = part.pins.k;

      if (!a || !k) continue;

      const ia = indexOf.get(a);
      const ik = indexOf.get(k);

      if (ia === undefined || ik === undefined) continue;

      elements.push({
        a: uf.find(ia),
        b: uf.find(ik),
        resistance: 220,
        id: part.id,
      });
    }

    // ----------------------------------------------------------
    // DIODE
    // ----------------------------------------------------------

    if (part.kind === "diode") {
      const a = part.pins.a;
      const k = part.pins.k;

      if (!a || !k) continue;

      const ia = indexOf.get(a);
      const ik = indexOf.get(k);

      if (ia === undefined || ik === undefined) continue;

      elements.push({
        a: uf.find(ia),
        b: uf.find(ik),
        resistance: 1000,
        id: part.id,
      });
    }

    // ----------------------------------------------------------
    // CAPACITOR
    // ----------------------------------------------------------

    if (part.kind === "capacitor") {
      const a = part.pins.a;
      const b = part.pins.b;

      if (!a || !b) continue;

      const ia = indexOf.get(a);
      const ib = indexOf.get(b);

      if (ia === undefined || ib === undefined) continue;

      // DC steady-state: capacitor behaves as open circuit.
      // Voltage is still reported later.
    }

    // ----------------------------------------------------------
    // INDUCTOR
    // ----------------------------------------------------------

    if (part.kind === "inductor") {
      const a = part.pins.a;
      const b = part.pins.b;

      if (!a || !b) continue;

      const ia = indexOf.get(a);
      const ib = indexOf.get(b);

      if (ia === undefined || ib === undefined) continue;

      // DC steady-state approximation.
      elements.push({
        a: uf.find(ia),
        b: uf.find(ib),
        resistance: 0.01,
        id: part.id,
      });
    }

    // ----------------------------------------------------------
    // BUZZER
    // ----------------------------------------------------------

    if (part.kind === "buzzer") {
      const a = part.pins.a;
      const b = part.pins.b;

      if (!a || !b) continue;

      const ia = indexOf.get(a);
      const ib = indexOf.get(b);

      if (ia === undefined || ib === undefined) continue;

      elements.push({
        a: uf.find(ia),
        b: uf.find(ib),
        resistance: 100,
        id: part.id,
      });
    }

    // ==========================================================
    // IMPORTANT:
    // MCU AND LCD ARE NOT FAKE RESISTORS ANYMORE.
    //
    // Their power pins are handled by the MCU/LCD runtime below.
    // ==========================================================
  }

  // ============================================================
  // SOLVE NORMAL DC CIRCUIT
  // ============================================================

  let solved: Record<number, number> = {};

  if (
    positiveNode !== null &&
    negativeNode !== null &&
    positiveNode !== negativeNode
  ) {
    try {
      solved = solve({
        nodes: nodeList,
        elements,
        positiveNode,
        negativeNode,
        voltage: input.psuVoltage,
      });
    } catch {
      solved = {};
    }
  }

  // ============================================================
  // COPY NODE VOLTAGES BACK TO HOLES
  // ============================================================

  for (const hole of ALL_HOLES) {
    const index = indexOf.get(hole);

    if (index === undefined) continue;

    const node = uf.find(index);

    voltages[hole] = solved[node] ?? 0;
  }

  // ============================================================
  // HELPER: VOLTAGE AT PART PIN
  // ============================================================

  function voltageAt(
    part: PlacedPart,
    pin: string,
  ): number {
    const hole = part.pins[pin];

    if (!hole) return 0;

    return voltages[hole] ?? 0;
  }

  // ============================================================
  // NORMAL COMPONENT RESULTS
  // ============================================================

  const currents: Record<string, number> = {};
  const leds: Record<
    string,
    {
      on: boolean;
      brightness: number;
    }
  > = {};

  const diodes: Record<
    string,
    {
      on: boolean;
      voltage: number;
    }
  > = {};

  const switches: Record<
    string,
    {
      closed: boolean;
    }
  > = {};

  const buttons: Record<
    string,
    {
      pressed: boolean;
    }
  > = {};

  const capacitors: Record<
    string,
    {
      voltage: number;
    }
  > = {};

  const inductors: Record<
    string,
    {
      current: number;
    }
  > = {};

  const buzzers: Record<
    string,
    {
      on: boolean;
    }
  > = {};

  // ============================================================
  // COMPONENT ANALYSIS
  // ============================================================

  for (const part of input.parts) {
    // ----------------------------------------------------------
    // RESISTOR
    // ----------------------------------------------------------

    if (part.kind === "resistor") {
      const va = voltageAt(part, "a");
      const vb = voltageAt(part, "b");

      const resistance = Math.max(
        0.001,
        part.props.resistance ?? 1000,
      );

      currents[part.id] =
        (va - vb) / resistance;
    }

    // ----------------------------------------------------------
    // POT
    // ----------------------------------------------------------

    if (part.kind === "pot") {
      const va = voltageAt(part, "a");
      const vw = voltageAt(part, "w");
      const vb = voltageAt(part, "b");

      const resistance = Math.max(
        1,
        part.props.resistance ?? 10000,
      );

      currents[`${part.id}:aw`] =
        (va - vw) / (resistance / 2);

      currents[`${part.id}:wb`] =
        (vw - vb) / (resistance / 2);
    }

    // ----------------------------------------------------------
    // LED
    // ----------------------------------------------------------

    if (part.kind === "led") {
      const va = voltageAt(part, "a");
      const vk = voltageAt(part, "k");

      const forwardVoltage = va - vk;

      const on = forwardVoltage > 1.5;

      leds[part.id] = {
        on,
        brightness: on
          ? Math.min(
              1,
              Math.max(
                0,
                (forwardVoltage - 1.5) / 1.5,
              ),
            )
          : 0,
      };
    }

    // ----------------------------------------------------------
    // DIODE
    // ----------------------------------------------------------

    if (part.kind === "diode") {
      const va = voltageAt(part, "a");
      const vk = voltageAt(part, "k");

      const voltage = va - vk;

      diodes[part.id] = {
        on: voltage > 0.55,
        voltage,
      };
    }

    // ----------------------------------------------------------
    // SWITCH
    // ----------------------------------------------------------

    if (part.kind === "switch") {
      switches[part.id] = {
        closed: Boolean(part.props.closed),
      };
    }

    // ----------------------------------------------------------
    // BUTTON
    // ----------------------------------------------------------

    if (part.kind === "button") {
      buttons[part.id] = {
        pressed: Boolean(part.props.closed),
      };
    }

    // ----------------------------------------------------------
    // CAPACITOR
    // ----------------------------------------------------------

    if (part.kind === "capacitor") {
      capacitors[part.id] = {
        voltage:
          voltageAt(part, "a") -
          voltageAt(part, "b"),
      };
    }

    // ----------------------------------------------------------
    // INDUCTOR
    // ----------------------------------------------------------

    if (part.kind === "inductor") {
      const va = voltageAt(part, "a");
      const vb = voltageAt(part, "b");

      inductors[part.id] = {
        current:
          (va - vb) / 0.01,
      };
    }

    // ----------------------------------------------------------
    // BUZZER
    // ----------------------------------------------------------

    if (part.kind === "buzzer") {
      const voltage =
        voltageAt(part, "a") -
        voltageAt(part, "b");

      buzzers[part.id] = {
        on: Math.abs(voltage) >= 2,
      };
    }
  }

  // ============================================================
  // MCU RUNTIME
  // ============================================================

  const mcus: SimResult["mcus"] = {};

  for (const mcu of input.parts) {
    if (mcu.kind !== "mcu") continue;

    const vcc =
      voltageAt(mcu, "vcc");

    const gnd =
      voltageAt(mcu, "gnd");

    const powered =
      vcc - gnd >= 3.0;

    const code =
      mcu.props.code ??
      "";

    const runtime =
      executeMcuProgram(
        mcu,
        code,
        powered,
      );

    mcus[mcu.id] = {
      id: mcu.id,
      model:
        mcu.props.mcuModel ??
        "arduino-uno",

      powered,

      running:
        powered &&
        runtime.state.running,

      digital:
        runtime.state.digital,

      pinModes:
        runtime.state.modes,

      error:
        runtime.state.error,
    };
  }

  // ============================================================
  // LCD RUNTIME
  // ============================================================

  const lcds: SimResult["lcds"] = {};

  // Each LCD gets its own HD44780 state.
  const lcdRuntime =
    new Map<string, Hd44780State>();

  // ============================================================
  // FIND MCU DIGITAL PIN VALUE
  // ============================================================

  function mcuDigitalValue(
    mcu: PlacedPart,
    pinName: string,
    runtime: ReturnType<
      typeof executeMcuProgram
    >,
  ): 0 | 1 {
    const value =
      runtime.state.digital[pinName];

    if (value === 1) return 1;

    return 0;
  }

  // ============================================================
  // READ LCD PIN FROM ITS ELECTRICAL NET
  // ============================================================

  function lcdPinValue(
    lcd: PlacedPart,
    pinName: string,
    mcuRuntimes: Map<
      string,
      ReturnType<typeof executeMcuProgram>
    >,
  ): 0 | 1 {
    const lcdHole =
      lcd.pins[pinName];

    if (!lcdHole) {
      return 0;
    }

    const lcdIndex =
      indexOf.get(lcdHole);

    if (lcdIndex === undefined) {
      return 0;
    }

    const lcdNode =
      uf.find(lcdIndex);

    // ----------------------------------------------------------
    // First check MCU outputs connected to this same net.
    // ----------------------------------------------------------

    for (const mcu of input.parts) {
      if (mcu.kind !== "mcu") continue;

      const runtime =
        mcuRuntimes.get(mcu.id);

      if (!runtime) continue;

      for (
        const [digitalPin, value]
        of Object.entries(runtime.state.digital)
      ) {
        const mcuHole =
          mcu.pins[digitalPin];

        if (!mcuHole) continue;

        const mcuIndex =
          indexOf.get(mcuHole);

        if (mcuIndex === undefined) continue;

        const mcuNode =
          uf.find(mcuIndex);

        if (mcuNode === lcdNode) {
          return value === 1
            ? 1
            : 0;
        }
      }
    }

    // ----------------------------------------------------------
    // If connected to the PSU negative rail, treat as LOW.
    // ----------------------------------------------------------

    if (
      negativeNode !== null &&
      lcdNode === negativeNode
    ) {
      return 0;
    }

    // ----------------------------------------------------------
    // If connected to the positive rail, treat as HIGH.
    // ----------------------------------------------------------

    if (
      positiveNode !== null &&
      lcdNode === positiveNode &&
      input.psuVoltage >= 3
    ) {
      return 1;
    }

    return 0;
  }

  // ============================================================
  // EXECUTE MCU PROGRAMS AGAIN
  //
  // We need the runtime objects because their pin events
  // represent the actual digital activity sent to peripherals.
  // ============================================================

  const mcuRuntimes =
    new Map<
      string,
      ReturnType<typeof executeMcuProgram>
    >();

  for (const mcu of input.parts) {
    if (mcu.kind !== "mcu") continue;

    const powered =
      voltageAt(mcu, "vcc") -
        voltageAt(mcu, "gnd") >=
      3.0;

    const runtime =
      executeMcuProgram(
        mcu,
        mcu.props.code ?? "",
        powered,
      );

    mcuRuntimes.set(
      mcu.id,
      runtime,
    );

    // Keep the exact state returned by this execution.
    mcus[mcu.id] = {
      id: mcu.id,
      model:
        mcu.props.mcuModel ??
        "arduino-uno",

      powered,

      running:
        powered &&
        runtime.state.running,

      digital:
        runtime.state.digital,

      pinModes:
        runtime.state.modes,

      error:
        runtime.state.error,
    };
  }

  // ============================================================
  // PROCESS EVERY LCD
  // ============================================================

  for (const lcd of input.parts) {
    if (lcd.kind !== "lcd") continue;

    const vdd =
      voltageAt(lcd, "vdd");

    const vss =
      voltageAt(lcd, "vss");

    const powered =
      vdd - vss >= 3.0;

    let state =
      lcdRuntime.get(lcd.id);

    if (!state) {
      state = createHd44780();

      lcdRuntime.set(
        lcd.id,
        state,
      );
    }

    // ----------------------------------------------------------
    // Current LCD bus values.
    // ----------------------------------------------------------

    let previous: Hd44780Pins = {
      rs: 0,
      rw: 0,
      e: 0,
      d4: 0,
      d5: 0,
      d6: 0,
      d7: 0,
    };

    // ----------------------------------------------------------
    // Replay MCU digital pin events.
    //
    // This is important:
    //
    // We do NOT simply read the final MCU pin state.
    //
    // HD44780 communication depends on E transitions.
    // ----------------------------------------------------------

    for (const mcu of input.parts) {
      if (mcu.kind !== "mcu") continue;

      const runtime =
        mcuRuntimes.get(mcu.id);

      if (!runtime) continue;

      for (const event of runtime.pinEvents) {
        const current: Hd44780Pins = {
          rs: previous.rs,
          rw: previous.rw,
          e: previous.e,
          d4: previous.d4,
          d5: previous.d5,
          d6: previous.d6,
          d7: previous.d7,
        };

        // ------------------------------------------------------
        // Update the changed MCU pin.
        // ------------------------------------------------------

        const eventHole =
          mcu.pins[event.pin];

        if (!eventHole) continue;

        const eventIndex =
          indexOf.get(eventHole);

        if (eventIndex === undefined) continue;

        const eventNode =
          uf.find(eventIndex);

        // ------------------------------------------------------
        // Find which LCD pin shares this electrical net.
        // ------------------------------------------------------

        const lcdPinNames = [
          "rs",
          "rw",
          "e",
          "d4",
          "d5",
          "d6",
          "d7",
        ] as const;

        for (
          const lcdPin of lcdPinNames
        ) {
          const lcdHole =
            lcd.pins[lcdPin];

          if (!lcdHole) continue;

          const lcdIndex =
            indexOf.get(lcdHole);

          if (lcdIndex === undefined) {
            continue;
          }

          const lcdNode =
            uf.find(lcdIndex);

          if (
            lcdNode === eventNode
          ) {
            current[lcdPin] =
              event.value;
          }
        }

        // ------------------------------------------------------
        // Clock the LCD.
        //
        // HD44780 captures data when E goes HIGH -> LOW.
        // ------------------------------------------------------

        state =
          clockHd44780(
            state,
            previous,
            current,
          );

        previous = current;
      }
    }

    // ----------------------------------------------------------
    // If R/W is physically grounded, force LOW.
    // ----------------------------------------------------------

    const rw =
      lcdPinValue(
        lcd,
        "rw",
        mcuRuntimes,
      );

    // ----------------------------------------------------------
    // Save LCD state.
    // ----------------------------------------------------------

    const text =
      powered
        ? lcdText(state)
        : "";

    lcds[lcd.id] = {
      id: lcd.id,
      powered,

      text,

      displayOn:
        powered &&
        state.displayOn,

      cursorOn:
        powered &&
        state.cursorOn,

      blinkOn:
        powered &&
        state.blinkOn,

      cursorColumn:
        state.cursorColumn,

      cursorRow:
        state.cursorRow,
    };
  }

  // ============================================================
  // BACKWARDS-COMPATIBILITY DISPLAY VALUES
  // ============================================================

  const firstLcd =
    Object.values(lcds)[0];

  const firstMcu =
    Object.values(mcus)[0];

  const mcuPowered =
    Boolean(firstMcu?.powered);

  const lcdPowered =
    Boolean(firstLcd?.powered);

  const displayText =
    firstLcd?.text ?? "";

  // ============================================================
  // FINAL RESULT
  // ============================================================

  return {
    voltages,
    currents,

    leds,
    diodes,

    switches,
    buttons,

    capacitors,
    inductors,
    buzzers,

    mcus,
    lcds,

    // Compatibility with the current mesh code.
    mcuPowered,
    lcdPowered,
    lcdText: displayText,
  };
}