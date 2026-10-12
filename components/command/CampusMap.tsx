"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { BlockDrawer } from "./BlockDrawer";
import {
  type BlockCode,
  type Severity,
  type Anomaly,
  BLOCK_NAMES,
  BLOCK_CODES,
} from "@/lib/contract";

interface CampusMapProps {
  blockSeverity: Record<BlockCode, Severity>;
  anomalies: Anomaly[];
}

interface BlockLayout {
  code: BlockCode;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
}

const BLOCKS_CONFIG: BlockLayout[] = [
  {
    code: "AB-A",
    x: 40,
    y: 40,
    w: 210,
    h: 175,
    label: "Academic Block A",
    sub: "Engineering",
  },
  {
    code: "AB-B",
    x: 40,
    y: 255,
    w: 210,
    h: 175,
    label: "Academic Block B",
    sub: "Sciences & Tanks",
  },
  {
    code: "LIB",
    x: 295,
    y: 40,
    w: 210,
    h: 175,
    label: "Library & Admin",
    sub: "Central Archive",
  },
  {
    code: "MESS",
    x: 295,
    y: 255,
    w: 210,
    h: 175,
    label: "Mess & Canteen",
    sub: "Central Dining",
  },
  {
    code: "HST-1",
    x: 550,
    y: 40,
    w: 210,
    h: 175,
    label: "Boys Hostel 1",
    sub: "Residences",
  },
  {
    code: "HST-2",
    x: 550,
    y: 255,
    w: 210,
    h: 175,
    label: "Girls Hostel",
    sub: "Residences",
  },
];

const SEVERITY_COLORS: Record<
  Severity,
  {
    fill: string;
    stroke: string;
    badgeBg: string;
    text: string;
    label: string;
  }
> = {
  green: {
    fill: "rgba(22, 163, 74, 0.08)",
    stroke: "#16A34A",
    badgeBg: "#16A34A",
    text: "Normal",
    label: "Operating efficiently",
  },
  amber: {
    fill: "rgba(245, 158, 11, 0.12)",
    stroke: "#F59E0B",
    badgeBg: "#F59E0B",
    text: "Elevated",
    label: "Elevated load detected",
  },
  red: {
    fill: "rgba(220, 38, 38, 0.12)",
    stroke: "#DC2626",
    badgeBg: "#DC2626",
    text: "Critical",
    label: "Active fault confirmed",
  },
};

export function CampusMap({ blockSeverity, anomalies }: CampusMapProps) {
  const [selectedBlock, setSelectedBlock] = useState<BlockCode | null>(null);

  const selectedSeverity = selectedBlock
    ? (blockSeverity[selectedBlock] ?? "green")
    : "green";

  return (
    <Card className="flex flex-col gap-6">
      {/* Header and Severity Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-section text-ink">Campus Facility Map</h2>
          <p className="text-body text-ink-secondary">
            Six primary campus zones. Select any block to inspect active anomalies.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-caption font-medium text-ink-secondary">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#16A34A" }}
            />
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#F59E0B" }}
            />
            <span>Elevated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "#DC2626" }}
            />
            <span>Critical</span>
          </div>
        </div>
      </div>

      {/* Inline Interactive SVG */}
      <div className="relative w-full overflow-hidden rounded-control border border-hairline bg-canvas p-2">
        <svg
          viewBox="0 0 800 470"
          className="h-auto w-full select-none"
          role="img"
          aria-label="Map of the 6 campus buildings coloured by anomaly severity"
        >
          {/* Subtle grid background */}
          <defs>
            <pattern
              id="campus-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.04)" />
            </pattern>
          </defs>
          <rect width="800" height="470" fill="url(#campus-grid)" rx="12" />

          {/* Campus connecting pathways */}
          <path
            d="M 145 215 L 145 255 M 400 215 L 400 255 M 655 215 L 655 255 M 250 127 L 295 127 M 505 127 L 550 127 M 250 342 L 295 342 M 505 342 L 550 342"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Six Campus Blocks */}
          {BLOCKS_CONFIG.map((b) => {
            const sev = blockSeverity[b.code] ?? "green";
            const styling = SEVERITY_COLORS[sev];
            const isSelected = selectedBlock === b.code;
            const blockAnomalies = anomalies.filter(
              (a) => a.location.block === b.code && a.status === "active",
            );

            return (
              <g
                key={b.code}
                tabIndex={0}
                role="button"
                aria-label={`${b.label}: status is ${styling.text}. ${blockAnomalies.length} active issues.`}
                onClick={() => setSelectedBlock(b.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedBlock(b.code);
                  }
                }}
                className="cursor-pointer transition-transform duration-150 outline-none focus-visible:[&>rect:first-child]:stroke-brand focus-visible:[&>rect:first-child]:stroke-[3.5]"
              >
                {/* Block Card Background */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="18"
                  fill="#FFFFFF"
                  stroke={styling.stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.04))"
                />

                {/* Severity Soft Tint Header */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={44}
                  rx="18"
                  fill={styling.fill}
                />
                <rect
                  x={b.x}
                  y={b.y + 20}
                  width={b.w}
                  height={24}
                  fill={styling.fill}
                />

                {/* Building Code Badge */}
                <text
                  x={b.x + 18}
                  y={b.y + 28}
                  fontFamily="-apple-system, system-ui, sans-serif"
                  fontSize="13"
                  fontWeight="600"
                  fill="#1D1D1F"
                >
                  {b.code}
                </text>

                {/* Severity Status Circle */}
                <circle
                  cx={b.x + b.w - 24}
                  cy={b.y + 22}
                  r="6"
                  fill={styling.badgeBg}
                />

                {/* Building Title */}
                <text
                  x={b.x + 18}
                  y={b.y + 75}
                  fontFamily="-apple-system, system-ui, sans-serif"
                  fontSize="15"
                  fontWeight="600"
                  fill="#1D1D1F"
                >
                  {b.label}
                </text>

                {/* Subtitle */}
                <text
                  x={b.x + 18}
                  y={b.y + 98}
                  fontFamily="-apple-system, system-ui, sans-serif"
                  fontSize="12"
                  fontWeight="400"
                  fill="#6E6E73"
                >
                  {b.sub}
                </text>

                {/* Anomaly Count Indicator */}
                <g transform={`translate(${b.x + 18}, ${b.y + 124})`}>
                  <rect
                    width={b.w - 36}
                    height="32"
                    rx="8"
                    fill="rgba(0,0,0,0.03)"
                  />
                  <text
                    x="10"
                    y="20"
                    fontFamily="-apple-system, system-ui, sans-serif"
                    fontSize="11.5"
                    fontWeight="500"
                    fill={blockAnomalies.length > 0 ? styling.stroke : "#6E6E73"}
                  >
                    {blockAnomalies.length > 0
                      ? `${blockAnomalies.length} active issue${
                          blockAnomalies.length > 1 ? "s" : ""
                        }`
                      : "0 issues detected"}
                  </text>
                  <text
                    x={b.w - 50}
                    y="20"
                    fontFamily="-apple-system, system-ui, sans-serif"
                    fontSize="11"
                    fontWeight="500"
                    fill="#1E7F5C"
                  >
                    View →
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Hidden Accessible Table for Screen Readers */}
      <table className="sr-only">
        <caption>Campus Buildings Status Overview</caption>
        <thead>
          <tr>
            <th scope="col">Code</th>
            <th scope="col">Building Name</th>
            <th scope="col">Severity</th>
            <th scope="col">Active Issues</th>
          </tr>
        </thead>
        <tbody>
          {BLOCK_CODES.map((code) => {
            const sev = blockSeverity[code] ?? "green";
            const blockIssues = anomalies.filter(
              (a) => a.location.block === code && a.status === "active",
            );
            return (
              <tr key={code}>
                <td>{code}</td>
                <td>{BLOCK_NAMES[code]}</td>
                <td>{sev}</td>
                <td>{blockIssues.length} active issues</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Block Drawer on click */}
      <BlockDrawer
        block={selectedBlock}
        severity={selectedSeverity}
        anomalies={anomalies}
        open={selectedBlock !== null}
        onClose={() => setSelectedBlock(null)}
      />
    </Card>
  );
}
