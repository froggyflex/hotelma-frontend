import React, { useMemo } from "react";

/**
 * TableMap
 * Pure renderer for both:
 * - Waiter mode (click to select table)
 * - Admin mode (drag tables)
 */

// ---------- DEFAULT FALLBACK (waiter only, if no layout exists) ----------
const DEFAULT_LAYOUT = {
  width: 1000,
  height: 600,
  tableSize: 110,
  doors: [],
};
const isMobile = window.innerWidth < 640; // Tailwind sm breakpoint
// ---------- DOOR ----------
function DoorMark({ x, y, orientation }) {
  const len = 60;
  const tick = 14;

  if (orientation === "vertical") {
    return (
      <g opacity="0.5">
        <line x1={x} y1={y - len / 2} x2={x} y2={y + len / 2} stroke="black" strokeWidth="4" />
        <line x1={x} y1={y - len / 2} x2={x + tick} y2={y - len / 2} stroke="black" strokeWidth="4" />
      </g>
    );
  }

  return (
    <g opacity="0.5">
      <line x1={x - len / 2} y1={y} x2={x + len / 2} y2={y} stroke="black" strokeWidth="4" />
      <line x1={x - len / 2} y1={y} x2={x - len / 2} y2={y + tick} stroke="black" strokeWidth="4" />
    </g>
  );
}

function Grid({ width, height, size }) {
  const lines = [];

  for (let x = 0; x <= width; x += size) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#E5E7EB"
        strokeWidth="1"
      />
    );
  }

  for (let y = 0; y <= height; y += size) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke="#E5E7EB"
        strokeWidth="1"
      />
    );
  }

  return <g>{lines}</g>;
}


// ---------- TABLE ----------
function TableNode({
  x,
  y,
  size,
  label,
  selected,
  admin,
  onClick,
  onDragStart,
}) {
  const half = size / 2;

  const fill = selected ? "#DBEAFE" : "#F8FAFC";
  const stroke = selected ? "#2563EB" : "#CBD5E1";
  const textFill = selected ? "#1D4ED8" : "#0F172A";

  return (
    <g
      onClick={!admin ? onClick : undefined}
      onMouseDown={admin ? onDragStart : undefined}
      style={{ cursor: admin ? "grab" : "pointer" }}
    >
      <rect
        x={x - half}
        y={y - half}
        width={size}
        height={size}
        rx={16}
        ry={16}
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
      />
      <text
        x={x}
        y={y + 6}
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill={textFill}
        style={{ userSelect: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

// ---------- MAIN ----------
export default function TableMap({
  tables = [],
  layout,
  selectedTableId,
  onSelect,
  admin = false,
  onDragStart,
}) {
  const effectiveLayout = layout ?? DEFAULT_LAYOUT;

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) =>
      String(a.name).localeCompare(String(b.name))
    );
  }, [tables]);

  if (!sortedTables.length) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-500">
        No tables available
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="text-sm font-semibold text-slate-700">Table Map</div>
        <div className="text-xs text-slate-500">
          {admin ? "Drag tables to reposition" : "Tap a table to open order"}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-slate-50">
        <svg
          viewBox={`0 0 ${effectiveLayout.width} ${effectiveLayout.height}`}
          className="w-full h-auto block"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* background */}
          <rect
            x="0"
            y="0"
            width={effectiveLayout.width}
            height={effectiveLayout.height}
            fill="#F8FAFC"
          />

          {/* doors */}
          {effectiveLayout.doors?.map((d, idx) => (
            <DoorMark key={idx} {...d} />
          ))}

          {/* tables */}
          {sortedTables.map((t, idx) => {
            const pos = t._pos;

            if (
              !pos ||
              typeof pos.x !== "number" ||
              typeof pos.y !== "number"
            ) {
              return null;
            }

            return (
              <TableNode
                key={t._id}
                x={pos.x}
                y={pos.y}
                size={
                  (effectiveLayout.tableSize ?? 110) *
                  (isMobile ? 1.4 : 1)
                }
                label={`T${idx + 1}`}
                selected={selectedTableId === t._id}
                admin={admin}
                onClick={() => onSelect?.(t)}
                onDragStart={() => onDragStart?.(t._id)}
              />
            );
          })}
        </svg>
      </div>

      <div className="px-2 pt-2 text-xs text-slate-500">
        Table labels are temporary (T1..). Order nicknames remain per-order.
      </div>
    </div>
  );
}
