import type { PlacedPart } from "./types";

export type PinMode =
  | "INPUT"
  | "OUTPUT"
  | "INPUT_PULLUP";

export interface McuRuntimeState {
  powered: boolean;
  running: boolean;
  error?: string;

  digital: Record<string, 0 | 1>;
  modes: Record<string, PinMode>;

  lcdPins?: {
    rs: string;
    e: string;
    d4: string;
    d5: string;
    d6: string;
    d7: string;
  };
}

export interface McuPinEvent {
  pin: string;
  value: 0 | 1;
}

export interface McuProgramResult {
  state: McuRuntimeState;
  pinEvents: McuPinEvent[];
}

const DIGITAL_PINS = Array.from(
  { length: 14 },
  (_, i) => `d${i}`,
);

// ------------------------------------------------------------
// CODE NORMALIZATION
// ------------------------------------------------------------

function normalizeCode(code: string): string {
  return code
    // Remove /* ... */ comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Remove // comments
    .replace(/\/\/.*$/gm, "")
    .replace(/\r/g, "");
}

// ------------------------------------------------------------
// VALUE HELPERS
// ------------------------------------------------------------

function numberValue(value: string): number {
  const n = Number(value.trim());

  return Number.isFinite(n) ? n : 0;
}

function pinName(value: string): string {
  const v = value.trim();

  // Arduino style:
  // 13 -> d13
  if (/^\d+$/.test(v)) {
    return `d${v}`;
  }

  // D13 -> d13
  if (/^D\d+$/i.test(v)) {
    return v.toLowerCase();
  }

  return v.toLowerCase();
}

function highLowValue(value: string): 0 | 1 {
  const v = value.trim().toUpperCase();

  return v === "HIGH" || v === "1"
    ? 1
    : 0;
}

// ------------------------------------------------------------
// INITIAL MCU STATE
// ------------------------------------------------------------

function createInitialState(): McuRuntimeState {
  const digital: Record<string, 0 | 1> = {};
  const modes: Record<string, PinMode> = {};

  for (const pin of DIGITAL_PINS) {
    digital[pin] = 0;
    modes[pin] = "INPUT";
  }

  return {
    powered: false,
    running: false,
    digital,
    modes,
  };
}

// ------------------------------------------------------------
// LIQUIDCRYSTAL CONSTRUCTOR
// ------------------------------------------------------------
//
// Supports:
//
// LiquidCrystal lcd(rs, enable, d4, d5, d6, d7);
//
// Example:
//
// LiquidCrystal lcd(12, 11, 5, 4, 3, 2);
//
// becomes:
//
// rs = d12
// e  = d11
// d4 = d5
// d5 = d4
// d6 = d3
// d7 = d2
//
// ------------------------------------------------------------

function parseLiquidCrystal(
  source: string,
): McuRuntimeState["lcdPins"] | undefined {
  const regex =
    /LiquidCrystal\s+\w+\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/i;

  const match = source.match(regex);

  if (!match) {
    return undefined;
  }

  return {
    rs: pinName(match[1]),
    e: pinName(match[2]),
    d4: pinName(match[3]),
    d5: pinName(match[4]),
    d6: pinName(match[5]),
    d7: pinName(match[6]),
  };
}

// ------------------------------------------------------------
// EXECUTE MCU PROGRAM
// ------------------------------------------------------------
//
// This is intentionally a SAFE Arduino subset interpreter.
//
// It does NOT eval arbitrary JavaScript.
//
// Supported currently:
//
// pinMode()
// digitalWrite()
// LiquidCrystal lcd()
// lcd.begin()
// lcd.clear()
// lcd.home()
// lcd.setCursor()
// lcd.print()
// lcd.write()
// lcd.display()
// lcd.noDisplay()
// lcd.cursor()
// lcd.noCursor()
// lcd.blink()
// lcd.noBlink()
// delay()
//
// LCD functions generate real GPIO transitions which are later
// consumed by the HD44780 emulator.
// ------------------------------------------------------------

export function executeMcuProgram(
  part: PlacedPart,
  code: string,
  powered: boolean,
): McuProgramResult {
  const state = createInitialState();

  state.powered = powered;

  const pinEvents: McuPinEvent[] = [];

  // ----------------------------------------------------------
  // MCU OFF
  // ----------------------------------------------------------

  if (!powered) {
    return {
      state,
      pinEvents,
    };
  }

  const source = normalizeCode(code || "");

  // ----------------------------------------------------------
  // EMPTY PROGRAM
  // ----------------------------------------------------------

  if (!source.trim()) {
    return {
      state,
      pinEvents,
    };
  }

  state.running = true;

  try {
    // ========================================================
    // LiquidCrystal
    // ========================================================

    state.lcdPins =
      parseLiquidCrystal(source);

    // ========================================================
    // pinMode()
    // ========================================================

    const pinModeRegex =
      /pinMode\s*\(\s*([^,]+)\s*,\s*(OUTPUT|INPUT_PULLUP|INPUT)\s*\)/gi;

    for (const match of source.matchAll(
      pinModeRegex,
    )) {
      const pin = pinName(match[1]);

      const mode =
        match[2].toUpperCase() as PinMode;

      state.modes[pin] = mode;

      if (!(pin in state.digital)) {
        state.digital[pin] =
          mode === "INPUT_PULLUP"
            ? 1
            : 0;
      }
    }

    // ========================================================
    // digitalWrite()
    // ========================================================

    const digitalWriteRegex =
      /digitalWrite\s*\(\s*([^,]+)\s*,\s*(HIGH|LOW|1|0)\s*\)/gi;

    for (const match of source.matchAll(
      digitalWriteRegex,
    )) {
      const pin = pinName(match[1]);

      const value =
        highLowValue(match[2]);

      state.digital[pin] = value;

      pinEvents.push({
        pin,
        value,
      });
    }

    // ========================================================
    // LIQUIDCRYSTAL COMMANDS
    // ========================================================

    if (state.lcdPins) {
      executeLiquidCrystalProgram(
        source,
        state,
        pinEvents,
      );
    }

    return {
      state,
      pinEvents,
    };
  } catch (error) {
    state.running = false;

    state.error =
      error instanceof Error
        ? error.message
        : "MCU program error";

    return {
      state,
      pinEvents,
    };
  }
}

// ------------------------------------------------------------
// LCD GPIO HELPERS
// ------------------------------------------------------------

function setPin(
  state: McuRuntimeState,
  events: McuPinEvent[],
  pin: string,
  value: 0 | 1,
): void {
  state.digital[pin] = value;

  events.push({
    pin,
    value,
  });
}

function pulseEnable(
  state: McuRuntimeState,
  events: McuPinEvent[],
  ePin: string,
): void {
  setPin(
    state,
    events,
    ePin,
    1,
  );

  setPin(
    state,
    events,
    ePin,
    0,
  );
}

// ------------------------------------------------------------
// WRITE ONE 4-BIT LCD NIBBLE
// ------------------------------------------------------------

function writeNibble(
  state: McuRuntimeState,
  events: McuPinEvent[],
  pins: NonNullable<McuRuntimeState["lcdPins"]>,
  nibble: number,
): void {
  setPin(
    state,
    events,
    pins.d4,
    ((nibble >> 0) & 1) as 0 | 1,
  );

  setPin(
    state,
    events,
    pins.d5,
    ((nibble >> 1) & 1) as 0 | 1,
  );

  setPin(
    state,
    events,
    pins.d6,
    ((nibble >> 2) & 1) as 0 | 1,
  );

  setPin(
    state,
    events,
    pins.d7,
    ((nibble >> 3) & 1) as 0 | 1,
  );

  pulseEnable(
    state,
    events,
    pins.e,
  );
}

// ------------------------------------------------------------
// WRITE ONE BYTE TO HD44780
// ------------------------------------------------------------

function writeLcdByte(
  state: McuRuntimeState,
  events: McuPinEvent[],
  pins: NonNullable<McuRuntimeState["lcdPins"]>,
  value: number,
  rs: 0 | 1,
): void {
  // RS
  setPin(
    state,
    events,
    pins.rs,
    rs,
  );

  // High nibble
  writeNibble(
    state,
    events,
    pins,
    (value >> 4) & 0x0f,
  );

  // Low nibble
  writeNibble(
    state,
    events,
    pins,
    value & 0x0f,
  );
}

// ------------------------------------------------------------
// LCD STRING
// ------------------------------------------------------------

function writeLcdText(
  state: McuRuntimeState,
  events: McuPinEvent[],
  pins: NonNullable<McuRuntimeState["lcdPins"]>,
  text: string,
): void {
  for (const char of text) {
    writeLcdByte(
      state,
      events,
      pins,
      char.charCodeAt(0),
      1,
    );
  }
}

// ------------------------------------------------------------
// EXECUTE LIQUIDCRYSTAL FUNCTIONS
// ------------------------------------------------------------

function executeLiquidCrystalProgram(
  source: string,
  state: McuRuntimeState,
  events: McuPinEvent[],
): void {
  const pins = state.lcdPins;

  if (!pins) {
    return;
  }

  // ========================================================
  // lcd.begin(columns, rows)
  // ========================================================

  const beginRegex =
    /\b\w+\.begin\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi;

  for (const match of source.matchAll(
    beginRegex,
  )) {
    const columns = numberValue(match[1]);
    const rows = numberValue(match[2]);

    // Standard HD44780 initialization:
    //
    // The actual power-up sequence is more complicated,
    // but these commands put the simulated LCD into the
    // expected 4-bit, display-on state.

    writeNibble(
      state,
      events,
      pins,
      0x03,
    );

    writeNibble(
      state,
      events,
      pins,
      0x03,
    );

    writeNibble(
      state,
      events,
      pins,
      0x03,
    );

    writeNibble(
      state,
      events,
      pins,
      0x02,
    );

    const functionSet =
      rows > 1
        ? 0x28
        : 0x20;

    writeLcdByte(
      state,
      events,
      pins,
      functionSet,
      0,
    );

    // Display ON
    writeLcdByte(
      state,
      events,
      pins,
      0x0c,
      0,
    );

    // Clear
    writeLcdByte(
      state,
      events,
      pins,
      0x01,
      0,
    );

    // Entry mode: left to right
    writeLcdByte(
      state,
      events,
      pins,
      0x06,
      0,
    );

    // Prevent unused-variable warnings in stricter TS configs.
    void columns;
  }

  // ========================================================
  // lcd.clear()
  // ========================================================

  const clearRegex =
    /\b\w+\.clear\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    clearRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x01,
      0,
    );
  }

  // ========================================================
  // lcd.home()
  // ========================================================

  const homeRegex =
    /\b\w+\.home\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    homeRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x02,
      0,
    );
  }

  // ========================================================
  // lcd.setCursor(column, row)
  // ========================================================

  const cursorRegex =
    /\b\w+\.setCursor\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/gi;

  for (const match of source.matchAll(
    cursorRegex,
  )) {
    const column =
      numberValue(match[1]);

    const row =
      numberValue(match[2]);

    // Standard 16x2 addresses:
    //
    // row 0 -> 0x00
    // row 1 -> 0x40
    //
    // For additional rows we use the common
    // HD44780 DDRAM layout.

    const rowOffset =
      row === 0
        ? 0x00
        : row === 1
          ? 0x40
          : row === 2
            ? 0x14
            : 0x54;

    const address =
      0x80 +
      rowOffset +
      column;

    writeLcdByte(
      state,
      events,
      pins,
      address,
      0,
    );
  }

  // ========================================================
  // lcd.print("text")
  // ========================================================

  const printStringRegex =
    /\b\w+\.print\s*\(\s*"([^"]*)"\s*\)/gi;

  for (const match of source.matchAll(
    printStringRegex,
  )) {
    writeLcdText(
      state,
      events,
      pins,
      match[1],
    );
  }

  // ========================================================
  // lcd.println("text")
  // ========================================================

  const printlnStringRegex =
    /\b\w+\.println\s*\(\s*"([^"]*)"\s*\)/gi;

  for (const match of source.matchAll(
    printlnStringRegex,
  )) {
    writeLcdText(
      state,
      events,
      pins,
      match[1],
    );

    // Move cursor to next line.
    writeLcdByte(
      state,
      events,
      pins,
      0xc0,
      0,
    );
  }

  // ========================================================
  // lcd.write(number)
  // ========================================================

  const writeNumberRegex =
    /\b\w+\.write\s*\(\s*(\d+)\s*\)/gi;

  for (const match of source.matchAll(
    writeNumberRegex,
  )) {
    const value =
      numberValue(match[1]) & 0xff;

    writeLcdByte(
      state,
      events,
      pins,
      value,
      1,
    );
  }

  // ========================================================
  // lcd.display()
  // ========================================================

  const displayRegex =
    /\b\w+\.display\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    displayRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x0c,
      0,
    );
  }

  // ========================================================
  // lcd.noDisplay()
  // ========================================================

  const noDisplayRegex =
    /\b\w+\.noDisplay\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    noDisplayRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x08,
      0,
    );
  }

  // ========================================================
  // lcd.cursor()
  // ========================================================

  const cursorOnRegex =
    /\b\w+\.cursor\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    cursorOnRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x0e,
      0,
    );
  }

  // ========================================================
  // lcd.noCursor()
  // ========================================================

  const cursorOffRegex =
    /\b\w+\.noCursor\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    cursorOffRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x0c,
      0,
    );
  }

  // ========================================================
  // lcd.blink()
  // ========================================================

  const blinkRegex =
    /\b\w+\.blink\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    blinkRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x0d,
      0,
    );
  }

  // ========================================================
  // lcd.noBlink()
  // ========================================================

  const noBlinkRegex =
    /\b\w+\.noBlink\s*\(\s*\)/gi;

  for (const _match of source.matchAll(
    noBlinkRegex,
  )) {
    writeLcdByte(
      state,
      events,
      pins,
      0x0e,
      0,
    );
  }
}