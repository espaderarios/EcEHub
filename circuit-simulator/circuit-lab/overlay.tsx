import {
  ArrowLeft,
  Cable,
  Cpu,
  Gauge,
  Lightbulb,
  MousePointer2,
  RotateCcw,
  Trash2,
  Undo2,
  Zap,
  Minus,
  Play,
  ToggleLeft,
  CircleDot,
  Magnet,
  Volume2,
  CircuitBoard,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { holePosition } from "@/circuit/breadboard";

import {
  dividerPreset,
  firstLightPreset,
  helloWorldPreset,
} from "@/circuit/presets";

import {
  RESISTOR_VALUES,
  type ToolId,
  type WireColor,
} from "@/circuit/types";

import { Button } from "@/components/ui/button";

import { useLab } from "@/store/lab";

const TOOLS: {
  id: ToolId;
  label: string;
  hint: string;
  icon: any;
}[] = [
  {
    id: "select",
    label: "Select",
    hint: "Select and inspect",
    icon: MousePointer2,
  },

  {
    id: "wire",
    label: "Wire",
    hint: "Connect two holes",
    icon: Cable,
  },
  
  {
    id: "resistor",
    label: "Resistor",
    hint: "Non-polar component",
    icon: Minus,
  },

  {
    id: "led",
    label: "LED",
    hint: "A = + / K = ???",
    icon: Lightbulb,
  },

  {
    id: "diode",
    label: "Diode",
    hint: "A = + / K = ???",
    icon: Zap,
  },

  {
    id: "switch",
    label: "Switch",
    hint: "Place switch",
    icon: ToggleLeft,
  },

  {
    id: "button",
    label: "Push button",
    hint: "Click it to open or close",
    icon: CircleDot,
  },

  {
    id: "capacitor",
    label: "Capacitor",
    hint: "Place capacitor",
    icon: Gauge,
  },

  {
    id: "inductor",
    label: "Inductor",
    hint: "DC winding resistance model",
    icon: Magnet,
  },

  {
    id: "buzzer",
    label: "Buzzer",
    hint: "Powered piezo indicator",
    icon: Volume2,
  },

  {
    id: "pot",
    label: "Potentiometer",
    hint: "Place potentiometer",
    icon: Gauge,
  },

  {
    id: "relay",
    label: "Relay",
    hint: "Four pins: coil, coil, COM, NO",
    icon: CircuitBoard,
  },

  {
    id: "lcd",
    label: "LCD",
    hint: "Place LCD",
    icon: Cpu,
  },

  {
    id: "mcu",
    label: "Microcontroller",
    hint: "Place MCU",
    icon: Cpu,
  },

  {
    id: "probe",
    label: "Voltmeter",
    hint: "Measure voltage",
    icon: Gauge,
  },
];

const COLORS: WireColor[] = [
  "red",
  "black",
  "blue",
  "orange",
  "green",
  "yellow",
  "white",
];

const PIN_ORDER: Partial<Record<ToolId, string[]>> = {
  wire: ["end A", "end B"],
  resistor: ["A", "B"],
  led: ["anode +", "cathode ???"],
  diode: ["anode +", "cathode ???"],
  switch: ["A", "B"],
  button: ["A", "B"],
  capacitor: ["A", "B"],
  inductor: ["A", "B"],
  buzzer: ["+", "???"],
  pot: ["end A", "wiper", "end B"],
  relay: ["coil +", "coil ???", "COM", "NO"],
  lcd: ["VDD +", "VSS ???"],
  mcu: ["VCC +", "GND ???"],
};

function formatCurrent(value: number) {
  const abs = Math.abs(value);

  if (abs < 0.001) {
    return `${(value * 1000000).toFixed(1)} ??A`;
  }

  return `${(value * 1000).toFixed(2)} mA`;
}

function formatVoltage(value: number) {
  return `${value.toFixed(2)} V`;
}

export function LabOverlay() {
  const tool = useLab((s) => s.tool);

  const setTool = useLab((s) => s.setTool);

  const wireColor = useLab((s) => s.wireColor);

  const setWireColor = useLab(
    (s) => s.setWireColor
  );

  const resistorValue = useLab(
    (s) => s.resistorValue
  );

  const setResistorValue = useLab(
    (s) => s.setResistorValue
  );

  const ledColor = useLab(
    (s) => s.ledColor
  );

  const setLedColor = useLab(
    (s) => s.setLedColor
  );

  const powerOn = useLab(
    (s) => s.powerOn
  );

  const togglePower = useLab(
    (s) => s.togglePower
  );

  const voltage = useLab(
    (s) => s.psuVoltage
  );

  const setVoltage = useLab(
    (s) => s.setVoltage
  );

  const sim = useLab(
    (s) => s.sim
  );

  const pending = useLab(
    (s) => s.pendingHoles
  );

  const probeHole = useLab(
    (s) => s.probeHole
  );

  const selectedId = useLab(
    (s) => s.selectedId
  );

  const parts = useLab(
    (s) => s.parts
  );

  const wires = useLab(
    (s) => s.wires
  );

  const psuPositive = useLab(
    (s) => s.psuPositive
  );

  const psuNegative = useLab(
    (s) => s.psuNegative
  );

  const setSelectedResistance = useLab(
    (s) => s.setSelectedResistance
  );

  const setSelectedLedColor = useLab(
    (s) => s.setSelectedLedColor
  );

  const setSelectedLabel = useLab(
    (s) => s.setSelectedLabel
  );

  const loadPreset = useLab(
    (s) => s.loadPreset
  );

  const clearBoard = useLab(
    (s) => s.clearBoard
  );

  const undo = useLab(
    (s) => s.undo
  );

  const deleteSelected = useLab(
    (s) => s.deleteSelected
  );

  const selected = selectedId
    ? parts.find(
        (part) => part.id === selectedId
      ) ?? null
    : null;

  const probeVoltage = probeHole
    ? sim.voltages[probeHole] ?? 0
    : null;

  const pinOrder = PIN_ORDER[tool] ?? [];

  return (
    <>
      {/* TOP BAR */}

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            pointerEvents: "auto",
          }}
        >
          <button
            type="button"
            onClick={() =>
              window.navigate
                ? window.navigate("explore")
                : window.go?.("explore")
            }
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              border:
                "1px solid rgba(255,255,255,.12)",
              background:
                "rgba(8,15,28,.92)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div
            style={{
              padding: "9px 15px",
              borderRadius: 12,
              background:
                "rgba(8,15,28,.92)",
              border:
                "1px solid rgba(255,255,255,.12)",
              color: "white",
            }}
          >
            <div
              style={{
                fontSize: 10,
                opacity: 0.55,
                textTransform: "uppercase",
                letterSpacing: 1.5,
              }}
            >
              Explore ?? Electronics
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              Circuit Lab
            </div>
          </div>
        </div>

        {/* SIMULATION STATUS */}

        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 8,
            borderRadius: 14,
            background:
              "rgba(8,15,28,.92)",
            border:
              "1px solid rgba(255,255,255,.12)",
          }}
        >
          <button
            type="button"
            onClick={togglePower}
            style={{
              border: 0,
              borderRadius: 9,
              padding: "9px 14px",
              cursor: "pointer",
              fontWeight: 700,
              color: "white",
              background: powerOn
                ? "#16a34a"
                : "#334155",
            }}
          >
            <Play
              size={14}
              style={{
                display: "inline",
                marginRight: 6,
              }}
            />

            {powerOn
              ? "POWER ON"
              : "POWER OFF"}
          </button>

          <div
            style={{
              padding: "7px 10px",
              borderRadius: 8,
              background:
                "rgba(255,255,255,.06)",
              color: "#cbd5e1",
              fontFamily:
                "ui-monospace, monospace",
              fontSize: 12,
            }}
          >
            I = {formatCurrent(
              sim.supplyCurrent
            )}
          </div>
        </div>
      </div>

      {/* LEFT COMPONENT PANEL */}

      <aside
        style={{
          position: "absolute",
          top: 85,
          left: 16,
          bottom: 16,
          width: 270,
          zIndex: 90,
          overflowY: "auto",
          padding: 14,
          borderRadius: 18,
          background:
            "rgba(8,15,28,.94)",
          border:
            "1px solid rgba(255,255,255,.12)",
          color: "white",
          boxShadow:
            "0 20px 50px rgba(0,0,0,.35)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            opacity: 0.55,
          }}
        >
          Components
        </div>

        <div
          style={{
            marginTop: 6,
            marginBottom: 12,
            fontSize: 12,
            color: "#94a3b8",
            lineHeight: 1.5,
          }}
        >
          Select a part, then connect its pins in the order highlighted below.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 7,
          }}
        >
          {TOOLS.map((item) => {
            const Icon = item.icon;

            const active =
              tool === item.id;

            return (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                onClick={() =>
                  setTool(item.id)
                }
                style={{
                  minHeight: 55,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 9,
                  borderRadius: 11,
                  border: active
                    ? "1px solid #5eead4"
                    : "1px solid rgba(255,255,255,.08)",
                  background: active
                    ? "#164e63"
                    : "rgba(255,255,255,.05)",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={17} />

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* POWER */}

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop:
              "1px solid rgba(255,255,255,.1)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              opacity: 0.55,
            }}
          >
            Power Supply
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 7,
              marginTop: 9,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setTool("psu-positive")
              }
              style={{
                padding: 9,
                borderRadius: 9,
                border:
                  "1px solid rgba(239,68,68,.4)",
                background:
                  tool === "psu-positive"
                    ? "rgba(239,68,68,.3)"
                    : "rgba(239,68,68,.08)",
                color: "#fecaca",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Positive
            </button>

            <button
              type="button"
              onClick={() =>
                setTool("psu-negative")
              }
              style={{
                padding: 9,
                borderRadius: 9,
                border:
                  "1px solid rgba(255,255,255,.2)",
                background:
                  tool === "psu-negative"
                    ? "rgba(255,255,255,.15)"
                    : "rgba(255,255,255,.05)",
                color: "#e2e8f0",
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              Ground
            </button>
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 10,
              color: "#94a3b8",
              lineHeight: 1.6,
            }}
          >
            + {psuPositive ?? "not connected"}
            <br />
            ??? {psuNegative ?? "not connected"}
          </div>

          <label
            style={{
              display: "block",
              marginTop: 12,
              fontSize: 11,
              color: "#cbd5e1",
            }}
          >
            Supply voltage

            <input
              type="number"
              min="0"
              max="24"
              step="0.1"
              value={voltage}
              onChange={(e) =>
                setVoltage(
                  Number(e.target.value)
                )
              }
              style={{
                width: "100%",
                marginTop: 6,
                padding: 8,
                borderRadius: 8,
                border:
                  "1px solid rgba(255,255,255,.12)",
                background: "#111827",
                color: "white",
              }}
            />
          </label>
        </div>

        {/* WIRE SETTINGS */}

        {tool === "wire" && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop:
                "1px solid rgba(255,255,255,.1)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                opacity: 0.55,
              }}
            >
              Wire color
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
                marginTop: 9,
              }}
            >
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() =>
                    setWireColor(color)
                  }
                  style={{
                    width: 27,
                    height: 27,
                    borderRadius: "50%",
                    border:
                      wireColor === color
                        ? "3px solid white"
                        : "2px solid transparent",
                    background:
                      color === "white"
                        ? "#e5e7eb"
                        : color,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* RESISTOR SETTINGS */}

        {(tool === "resistor" || tool === "pot") && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop:
                "1px solid rgba(255,255,255,.1)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                opacity: 0.55,
              }}
            >
              {tool === "pot" ? "Potentiometer value" : "Resistor value"}
            </div>

            <select
              value={resistorValue}
              onChange={(e) =>
                setResistorValue(
                  Number(e.target.value)
                )
              }
              style={{
                width: "100%",
                marginTop: 8,
                padding: 9,
                borderRadius: 8,
                background: "#111827",
                color: "white",
                border:
                  "1px solid rgba(255,255,255,.12)",
              }}
            >
              {RESISTOR_VALUES.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value >= 1000
                      ? `${value / 1000} k??`
                      : `${value} ??`}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        {/* LED SETTINGS */}

        {tool === "led" && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop:
                "1px solid rgba(255,255,255,.1)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                opacity: 0.55,
              }}
            >
              LED color
            </div>

            <select
              value={ledColor}
              onChange={(e) =>
                setLedColor(
                  e.target.value as any
                )
              }
              style={{
                width: "100%",
                marginTop: 8,
                padding: 9,
                borderRadius: 8,
                background: "#111827",
                color: "white",
                border:
                  "1px solid rgba(255,255,255,.12)",
              }}
            >
              <option value="red">
                Red
              </option>

              <option value="green">
                Green
              </option>

              <option value="yellow">
                Yellow
              </option>

              <option value="blue">
                Blue
              </option>
            </select>
          </div>
        )}

        {/* SELECTED COMPONENT */}

        {selected && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop:
                "1px solid rgba(255,255,255,.1)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                opacity: 0.55,
              }}
            >
              Selected
            </div>

            <div
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 10,
                background:
                  "rgba(255,255,255,.05)",
              }}
            >
              <strong>
                {selected.kind}
              </strong>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 10,
                  color: "#94a3b8",
                }}
              >
                ID: {selected.id}
              </div>
            </div>

            <label
              style={{
                display: "block",
                marginTop: 9,
                fontSize: 11,
              }}
            >
              Label

              <input
                type="text"
                value={
                  selected.props.label ?? ""
                }
                placeholder="R1 / LED1 / SW1"
                onChange={(e) =>
                  setSelectedLabel(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  marginTop: 5,
                  padding: 8,
                  borderRadius: 8,
                  background: "#111827",
                  color: "white",
                  border:
                    "1px solid rgba(255,255,255,.12)",
                }}
              />
            </label>

            {(selected.kind === "resistor" || selected.kind === "pot") && (
              <input
                type="number"
                value={
                  selected.props
                    .resistance ?? 1000
                }
                onChange={(e) =>
                  setSelectedResistance(
                    Number(e.target.value)
                  )
                }
                style={{
                  width: "100%",
                  marginTop: 7,
                  padding: 8,
                  borderRadius: 8,
                  background: "#111827",
                  color: "white",
                  border:
                    "1px solid rgba(255,255,255,.12)",
                }}
              />
            )}

            {selected.kind === "led" && (
              <select
                value={
                  selected.props
                    .ledColor ?? "red"
                }
                onChange={(e) =>
                  setSelectedLedColor(
                    e.target.value as any
                  )
                }
                style={{
                  width: "100%",
                  marginTop: 7,
                  padding: 8,
                  borderRadius: 8,
                  background: "#111827",
                  color: "white",
                }}
              >
                <option value="red">
                  Red
                </option>

                <option value="green">
                  Green
                </option>

                <option value="yellow">
                  Yellow
                </option>

                <option value="blue">
                  Blue
                </option>
              </select>
            )}
          </div>
        )}

        {/* BOARD CONTROLS */}

        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop:
              "1px solid rgba(255,255,255,.1)",
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: 7,
          }}
        >
          <button
            type="button"
            onClick={undo}
            style={{
              padding: 9,
              borderRadius: 8,
              border:
                "1px solid rgba(255,255,255,.1)",
              background:
                "rgba(255,255,255,.05)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Undo2
              size={14}
              style={{
                display: "inline",
                marginRight: 5,
              }}
            />
            Undo
          </button>

          <button
            type="button"
            onClick={deleteSelected}
            style={{
              padding: 9,
              borderRadius: 8,
              border:
                "1px solid rgba(239,68,68,.25)",
              background:
                "rgba(239,68,68,.08)",
              color: "#fecaca",
              cursor: "pointer",
            }}
          >
            <Trash2
              size={14}
              style={{
                display: "inline",
                marginRight: 5,
              }}
            />
            Delete
          </button>

          <button
            type="button"
            onClick={clearBoard}
            style={{
              gridColumn: "1 / -1",
              padding: 10,
              borderRadius: 8,
              border:
                "1px solid rgba(255,255,255,.1)",
              background:
                "rgba(255,255,255,.05)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <RotateCcw
              size={14}
              style={{
                display: "inline",
                marginRight: 5,
              }}
            />
            Clear Breadboard
          </button>
        </div>
      </aside>

      {/* INSTRUCTIONS */}

      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 18,
          zIndex: 90,
          maxWidth: 330,
          padding: 13,
          borderRadius: 14,
          background:
            "rgba(8,15,28,.92)",
          border:
            "1px solid rgba(255,255,255,.12)",
          color: "white",
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        <strong>
          {pending.length
            ? `Pins ${pending.length}/${pinOrder.length}: ${pending.join(", ")}`
            : tool === "wire"
            ? "Wire mode"
            : tool === "select"
            ? "Select mode"
            : `${tool} mode`}
        </strong>

        <div
          style={{
            marginTop: 4,
            color: "#94a3b8",
          }}
        >
          {pending.length
            ? `Next pin: ${pinOrder[pending.length] ?? "complete the placement"}.`
            : pinOrder.length
              ? `Pin order: ${pinOrder.join(" ??? ")}.`
              : "Choose a component, then click the breadboard holes where its pins should connect."}
        </div>
      </div>

      {/* VOLTMETER */}

      {probeVoltage !== null && (
        <div
          style={{
            position: "absolute",
            top: 85,
            right: 18,
            zIndex: 95,
            padding: 14,
            borderRadius: 14,
            background:
              "rgba(8,15,28,.95)",
            border:
              "1px solid rgba(234,179,8,.35)",
            color: "white",
          }}
        >
          <div
            style={{
              fontSize: 10,
              opacity: 0.55,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Voltmeter
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 24,
              fontFamily:
                "ui-monospace, monospace",
              color: "#fde68a",
            }}
          >
            {formatVoltage(
              probeVoltage
            )}
          </div>

          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "#94a3b8",
            }}
          >
            Probe: {probeHole}
          </div>
        </div>
      )}

      {/* SIMULATION WARNINGS */}

      {sim.warnings.length > 0 && (
        <div
          style={{
            position: "absolute",
            right: 18,
            bottom: 18,
            zIndex: 91,
            maxWidth: 330,
            transform:
              "translateY(-90px)",
            padding: 12,
            borderRadius: 12,
            background:
              "rgba(127,29,29,.92)",
            border:
              "1px solid rgba(248,113,113,.35)",
            color: "#fee2e2",
            fontSize: 11,
          }}
        >
          <strong>
            Circuit warning
          </strong>

          {sim.warnings.map(
            (warning, index) => (
              <div
                key={index}
                style={{
                  marginTop: 4,
                }}
              >
                ??? {warning}
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
