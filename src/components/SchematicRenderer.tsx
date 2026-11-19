import React from "react";
import type { CircuitProjectModel } from "../types/circuitModel";
import {
  formatComponentDisplayValue,
  getPinWorldPosition,
} from "../utils/circuitModelEngine";

export interface SchematicRendererProps {
  /** Canonical single-source-of-truth circuit model (never read from global state). */
  model: CircuitProjectModel;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  canvasBg?: string;
  isLightTheme?: boolean;
  zoom?: number;
  pan?: { x: number; y: number };
  isPowered?: boolean;
  highlightFlow?: boolean;
  selectedComponentId?: string | null;
  selectedWireId?: string | null;
  selectedNetName?: string | null;
  pendingWirePin?: { componentId: string; pinId: string } | null;
  floatingComponentIds?: string[];
  disconnectedPins?: { componentId: string; pinId: string }[];
  onCanvasMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCanvasMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onComponentMouseDown?: (componentId: string, e: React.MouseEvent<SVGGElement>) => void;
  onComponentClick?: (componentId: string, e: React.MouseEvent<SVGGElement>) => void;
  onWireClick?: (wireId: string, netName: string, e: React.MouseEvent<SVGGElement>) => void;
  onPinClick?: (componentId: string, pinId: string, e: React.MouseEvent<SVGCircleElement>) => void;
}

/**
 * Pure Prop-Driven Schematic SVG Renderer
 * Always computes 100% of wires, pins, components, and labels directly from `props.model`.
 */
export const SchematicRenderer: React.FC<SchematicRendererProps> = ({
  model,
  svgRef,
  canvasBg = "#090D16",
  isLightTheme = false,
  zoom = 1.0,
  pan = { x: 0, y: 0 },
  isPowered = true,
  highlightFlow = true,
  selectedComponentId = null,
  selectedWireId = null,
  selectedNetName = null,
  pendingWirePin = null,
  floatingComponentIds = [],
  disconnectedPins = [],
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasMouseLeave,
  onComponentMouseDown,
  onComponentClick,
  onWireClick,
  onPinClick,
}) => {
  return (
    <div
      className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden select-none"
      style={{ backgroundColor: canvasBg }}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseLeave}
    >
      <svg
        ref={svgRef}
        data-project-id={model.projectId}
        data-circuit-id={model.circuitId}
        data-component-count={model.components.length}
        data-connection-count={model.connections.length}
        className="w-full h-full"
        viewBox="0 0 880 540"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          <pattern id="eng-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.8" fill={isLightTheme ? "#cbd5e1" : "#1e293b"} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eng-grid)" />

        {/* Dynamic Netlist Wires mapped strictly from model.connections */}
        {model.connections.map((w) => {
          const fromComp = model.components.find((c) => c.id === w.sourceComponentId);
          const toComp = model.components.find((c) => c.id === w.targetComponentId);
          if (!fromComp || !toComp) return null;

          const p1 = getPinWorldPosition(fromComp, w.sourcePinId);
          const p2 = getPinWorldPosition(toComp, w.targetPinId);
          const isSelectedWire = selectedWireId === w.id;
          const isSelectedNet = selectedNetName === w.netName;

          const midX = (p1.x + p2.x) / 2;
          const pathD = `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;

          return (
            <g
              key={w.id}
              data-wire-id={w.id}
              data-net-name={w.netName}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onWireClick?.(w.id, w.netName, e);
              }}
            >
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
              <path
                data-wire-trace={w.id}
                d={pathD}
                fill="none"
                stroke={
                  isSelectedWire
                    ? "#facc15"
                    : isSelectedNet
                    ? "#38bdf8"
                    : w.signalType === "POWER"
                    ? "#ef4444"
                    : w.signalType === "GROUND"
                    ? "#64748b"
                    : "#0284c7"
                }
                strokeWidth={isSelectedWire || isSelectedNet ? 3.2 : 2}
                strokeLinecap="round"
              />
              <circle cx={p1.x} cy={p1.y} r="3" fill="#38bdf8" />
              <circle cx={p2.x} cy={p2.y} r="3" fill="#38bdf8" />

              {isPowered && highlightFlow && (
                <>
                  {[0, 0.5].map((offset, idx) => (
                    <circle
                      key={`p-${w.id}-${idx}`}
                      r="2.5"
                      fill="#ffffff"
                      filter="drop-shadow(0 0 3px #38bdf8)"
                    >
                      <animateMotion
                        path={pathD}
                        dur="1.4s"
                        begin={`${-offset * 1.4}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </>
              )}
            </g>
          );
        })}

        {/* Dynamic Schematic Components mapped strictly from model.components */}
        {model.components.map((c) => {
          const isSelected = selectedComponentId === c.id;
          const isFloating = floatingComponentIds.includes(c.id);
          const { x, y } = c.position;
          const rot = c.orientation;

          return (
            <g
              key={c.id}
              data-component-id={c.id}
              data-component-refdes={c.refDes}
              data-component-type={c.type}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onMouseDown={(e) => {
                e.stopPropagation();
                onComponentMouseDown?.(c.id, e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onComponentClick?.(c.id, e);
              }}
            >
              {isSelected && (
                <rect
                  x="-44"
                  y="-38"
                  width="88"
                  height="76"
                  rx="8"
                  fill="rgba(56, 189, 248, 0.14)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              )}
              {isFloating && (
                <rect
                  x="-42"
                  y="-36"
                  width="84"
                  height="72"
                  rx="8"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  strokeDasharray="3 3"
                />
              )}

              {/* Rotated IEEE Std 315 Symbol Group */}
              <g transform={`rotate(${rot})`}>
                {c.type === "VOLTAGE_SOURCE" && (
                  <g>
                    <circle
                      cx="0"
                      cy="0"
                      r="18"
                      fill="#0f172a"
                      stroke={isSelected ? "#38bdf8" : "#ef4444"}
                      strokeWidth="2.2"
                    />
                    <line x1="0" y1="-26" x2="0" y2="-18" stroke="#ef4444" strokeWidth="2" />
                    <line x1="0" y1="18" x2="0" y2="26" stroke="#94a3b8" strokeWidth="2" />
                    <text x="0" y="-4" fill="#ef4444" fontSize="13" fontWeight="bold" textAnchor="middle">
                      +
                    </text>
                    <text x="0" y="11" fill="#94a3b8" fontSize="15" fontWeight="bold" textAnchor="middle">
                      -
                    </text>
                  </g>
                )}

                {c.type === "GROUND" && (
                  <g>
                    <line x1="0" y1="-22" x2="0" y2="0" stroke="#64748b" strokeWidth="2.5" />
                    <line
                      x1="-16"
                      y1="0"
                      x2="16"
                      y2="0"
                      stroke={isSelected ? "#38bdf8" : "#94a3b8"}
                      strokeWidth="2.5"
                    />
                    <line
                      x1="-10"
                      y1="5"
                      x2="10"
                      y2="5"
                      stroke={isSelected ? "#38bdf8" : "#94a3b8"}
                      strokeWidth="2"
                    />
                    <line
                      x1="-4"
                      y1="10"
                      x2="4"
                      y2="10"
                      stroke={isSelected ? "#38bdf8" : "#94a3b8"}
                      strokeWidth="1.5"
                    />
                  </g>
                )}

                {c.type === "TEST_POINT" && (
                  <g>
                    <circle cx="0" cy="-6" r="6" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                    <line x1="0" y1="0" x2="0" y2="20" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="0" cy="20" r="2.5" fill="#94a3b8" />
                  </g>
                )}

                {(c.type === "RESISTOR" || c.type === "POTENTIOMETER") && (
                  <g>
                    <line x1="-30" y1="0" x2="-20" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <path
                      d="M -20 0 L -16 -8 L -8 8 L 0 -8 L 8 8 L 16 -8 L 20 0"
                      fill="none"
                      stroke={isSelected ? "#38bdf8" : "#f1f5f9"}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                    <line x1="20" y1="0" x2="30" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    {c.type === "POTENTIOMETER" && (
                      <path
                        d="M 0 -22 L 0 -10 M -4 -14 L 0 -10 L 4 -14"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.8"
                      />
                    )}
                  </g>
                )}

                {c.type === "CAPACITOR" && (
                  <g>
                    <line x1="0" y1="-26" x2="0" y2="-8" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-14" y1="-8" x2="14" y2="-8" stroke="#f1f5f9" strokeWidth="2.5" />
                    <line x1="-14" y1="8" x2="14" y2="8" stroke="#f1f5f9" strokeWidth="2.5" />
                    <line x1="0" y1="8" x2="0" y2="26" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "CAPACITOR_POLARIZED" && (
                  <g>
                    <line x1="0" y1="-26" x2="0" y2="-8" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-14" y1="-8" x2="14" y2="-8" stroke="#f1f5f9" strokeWidth="3" />
                    <path d="M -14 6 Q 0 0 14 6" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
                    <line x1="0" y1="6" x2="0" y2="26" stroke="#94a3b8" strokeWidth="2" />
                    <text x="-14" y="-12" fill="#ef4444" fontSize="10" fontWeight="bold">
                      +
                    </text>
                  </g>
                )}

                {c.type === "INDUCTOR" && (
                  <g>
                    <line x1="-30" y1="0" x2="-24" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <path
                      d="M -24 0 A 6 6 0 0 1 -12 0 A 6 6 0 0 1 0 0 A 6 6 0 0 1 12 0 A 6 6 0 0 1 24 0"
                      fill="none"
                      stroke={isSelected ? "#38bdf8" : "#f1f5f9"}
                      strokeWidth="2.2"
                    />
                    <line x1="24" y1="0" x2="30" y2="0" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "DIODE" && (
                  <g>
                    <line x1="-26" y1="0" x2="-10" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <polygon
                      points="-10,-10 10,0 -10,10"
                      fill={isSelected ? "#38bdf8" : "#94a3b8"}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    <line x1="10" y1="-10" x2="10" y2="10" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="10" y1="0" x2="26" y2="0" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "LED" && (
                  <g>
                    <line x1="0" y1="-26" x2="0" y2="-8" stroke="#94a3b8" strokeWidth="2" />
                    <polygon
                      points="-10,-8 10,-8 0,8"
                      fill={isPowered ? "#22c55e" : "#0f172a"}
                      stroke="#22c55e"
                      strokeWidth="2"
                    />
                    <line x1="-10" y1="8" x2="10" y2="8" stroke="#22c55e" strokeWidth="2.5" />
                    <line x1="0" y1="8" x2="0" y2="26" stroke="#94a3b8" strokeWidth="2" />
                    <path d="M 6 -2 L 15 -11 M 13 -11 L 15 -11 L 15 -9" stroke="#facc15" strokeWidth="1.5" fill="none" />
                    <path d="M 10 4 L 19 -5 M 17 -5 L 19 -5 L 19 -3" stroke="#facc15" strokeWidth="1.5" fill="none" />
                  </g>
                )}

                {(c.type === "BJT_NPN" || c.type === "BJT_PNP") && (
                  <g>
                    <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                    <line x1="-22" y1="0" x2="-8" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-8" y1="-12" x2="-8" y2="12" stroke="#e2e8f0" strokeWidth="3" />
                    <line x1="-8" y1="-6" x2="12" y2="-16" stroke="#e2e8f0" strokeWidth="2" />
                    <line x1="12" y1="-16" x2="12" y2="-28" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-8" y1="6" x2="12" y2="16" stroke="#e2e8f0" strokeWidth="2" />
                    <polygon points="10,14 14,18 8,17" fill="#38bdf8" />
                    <line x1="12" y1="16" x2="12" y2="28" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "MOSFET_N" && (
                  <g>
                    <circle cx="0" cy="0" r="22" fill="#0f172a" stroke="#475569" strokeWidth="1.5" />
                    <line x1="-22" y1="0" x2="-10" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-10" y1="-14" x2="-10" y2="14" stroke="#38bdf8" strokeWidth="2.5" />
                    <line x1="-4" y1="-14" x2="-4" y2="14" stroke="#e2e8f0" strokeWidth="2.5" strokeDasharray="6 3" />
                    <line x1="-4" y1="-10" x2="14" y2="-10" stroke="#e2e8f0" strokeWidth="2" />
                    <line x1="14" y1="-10" x2="14" y2="-28" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-4" y1="10" x2="14" y2="10" stroke="#e2e8f0" strokeWidth="2" />
                    <line x1="14" y1="10" x2="14" y2="28" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-4" y1="0" x2="6" y2="0" stroke="#e2e8f0" strokeWidth="2" />
                    <polygon points="4,-4 0,0 4,4" fill="#38bdf8" />
                    <line x1="6" y1="0" x2="6" y2="10" stroke="#e2e8f0" strokeWidth="2" />
                  </g>
                )}

                {c.type === "OPAMP" && (
                  <g>
                    <polygon
                      points="-28,-26 28,0 -28,26"
                      fill="#0f172a"
                      stroke={isSelected ? "#38bdf8" : "#475569"}
                      strokeWidth="2"
                    />
                    <text x="-20" y="-12" fill="#ef4444" fontSize="12" fontWeight="bold">
                      -
                    </text>
                    <text x="-20" y="16" fill="#38bdf8" fontSize="12" fontWeight="bold">
                      +
                    </text>
                    <line x1="-36" y1="-12" x2="-28" y2="-12" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-36" y1="12" x2="-28" y2="12" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="28" y1="0" x2="38" y2="0" stroke="#94a3b8" strokeWidth="2" />
                  </g>
                )}

                {c.type === "SWITCH" && (
                  <g>
                    <circle cx="-16" cy="0" r="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
                    <circle cx="16" cy="0" r="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="-28" y1="0" x2="-16" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="16" y1="0" x2="28" y2="0" stroke="#94a3b8" strokeWidth="2" />
                    <line
                      x1="-16"
                      y1="0"
                      x2="16"
                      y2={c.nominalValue >= 1 ? 0 : -12}
                      stroke={c.nominalValue >= 1 ? "#22c55e" : "#f59e0b"}
                      strokeWidth="2.5"
                    />
                  </g>
                )}

                {(c.type === "TIMER_555" ||
                  c.type === "MICROCONTROLLER" ||
                  c.type === "IC_LOGIC" ||
                  c.type === "VOLTAGE_REGULATOR" ||
                  c.type === "ACTUATOR" ||
                  c.type === "SENSOR") && (
                  <g>
                    <rect
                      x="-38"
                      y="-28"
                      width="76"
                      height="56"
                      rx="6"
                      fill="#0f172a"
                      stroke={isSelected ? "#38bdf8" : "#475569"}
                      strokeWidth="2"
                    />
                    <circle cx="-32" cy="-20" r="2" fill="#94a3b8" />
                    <text
                      x="0"
                      y="4"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {c.partNumber || c.name.slice(0, 10)}
                    </text>
                  </g>
                )}
              </g>

              {/* Clickable Interactive Terminal Pin Pads */}
              {c.pins.map((pin) => {
                const wp = getPinWorldPosition(c, pin.id);
                const relX = wp.x - x;
                const relY = wp.y - y;
                const isPending =
                  pendingWirePin?.componentId === c.id && pendingWirePin?.pinId === pin.id;
                const isDisconn = disconnectedPins.some(
                  (dp) => dp.componentId === c.id && dp.pinId === pin.id
                );
                return (
                  <circle
                    key={`${c.id}-pin-${pin.id}`}
                    cx={relX}
                    cy={relY}
                    r={isPending ? 6 : 4.2}
                    fill={isPending ? "#facc15" : isDisconn ? "#f97316" : "#0f172a"}
                    stroke={isPending ? "#ffffff" : isDisconn ? "#facc15" : "#38bdf8"}
                    strokeWidth="1.6"
                    className="cursor-crosshair"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPinClick?.(c.id, pin.id, e);
                    }}
                  >
                    <title>{`${c.refDes} · ${pin.name} (Click to Wire)`}</title>
                  </circle>
                );
              })}

              {/* Upright Component Designator & Dynamic Value Labels */}
              <text
                x="0"
                y="-34"
                fill="#38bdf8"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {c.refDes}
              </text>
              <text
                x="0"
                y="40"
                fill="#94a3b8"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {formatComponentDisplayValue(c.type, c.nominalValue, c.unit)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SchematicRenderer;
