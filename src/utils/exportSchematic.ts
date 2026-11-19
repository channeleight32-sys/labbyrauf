import { CircuitNode } from "../components/CircuitLab";
import { COMP_SPECS, GATE_SPECS } from "../data/logicSpecs";

export type ExportTheme = "dark" | "light";

interface ExportSchematicOptions {
  svgElement: SVGSVGElement;
  nodes: CircuitNode[];
  circuitTitle: string;
  circuitPatternName: string;
  theme: ExportTheme;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getNodeBox(n: CircuitNode): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  const comp = COMP_SPECS[n.type];
  if (comp) {
    return { x: n.x - 24, y: n.y - 36, w: comp.w + 48, h: comp.h + 56 };
  }
  if (n.type === "INPUT" || n.type === "OUTPUT") {
    return { x: n.x - 24, y: n.y - 36, w: 104, h: 100 };
  }
  const spec = GATE_SPECS[n.type];
  const outX = spec?.outX || 75;
  // Include extra horizontal & vertical margin for the on-canvas operation badge above gates
  return { x: n.x - 60, y: n.y - 44, w: outX + 120, h: 128 };
}

/**
 * Generates a self-contained, publication-quality SVG string with embedded CSS,
 * auto-cropped bounding box around all circuit nodes, and an Engineering Lab Report
 * title block header & footer.
 */
export function buildLabReportSVG({
  svgElement,
  nodes,
  circuitTitle,
  circuitPatternName,
  theme,
}: ExportSchematicOptions): { svgString: string; width: number; height: number } {
  // Compute world bounding box of all nodes
  let minX = 20;
  let minY = 20;
  let maxX = 780;
  let maxY = 460;

  if (nodes.length > 0) {
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;
    for (const n of nodes) {
      const b = getNodeBox(n);
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }
  }

  const pad = 44;
  const worldX = Math.floor(minX - pad);
  const worldY = Math.floor(minY - pad);
  const contentW = Math.max(760, Math.ceil(maxX - minX + pad * 2));
  const contentH = Math.max(380, Math.ceil(maxY - minY + pad * 2));

  const headerH = 68;
  const footerH = 38;
  const totalW = contentW;
  const totalH = headerH + contentH + footerH;

  // Clone the inner world <g> from the live SVG (which is the first <g> inside svgElement)
  const worldGroup = svgElement.querySelector("g");
  let innerMarkup = "";
  if (worldGroup) {
    const clone = worldGroup.cloneNode(true) as SVGGElement;
    // Remove selection outlines or pending wire previews from export
    clone
      .querySelectorAll(".sel-outline, .wire.preview, .port-hit, .wire-hit")
      .forEach((el) => el.remove());

    // If light theme is selected for print reports, adjust inline badge colors for high contrast
    if (theme === "light") {
      clone.querySelectorAll("g.pointer-events-none").forEach((badgeGroup) => {
        const rect = badgeGroup.querySelector("rect");
        const text = badgeGroup.querySelector("text");
        if (rect && text) {
          const isCascade = rect.getAttribute("fill") === "#064e3b";
          rect.setAttribute("fill", isCascade ? "#ecfdf5" : "#f0f9ff");
          rect.setAttribute("stroke", isCascade ? "#059669" : "#0284c7");
          text.setAttribute("fill", isCascade ? "#065f46" : "#0369a1");
        }
      });
    }

    innerMarkup = clone.innerHTML;
  }

  const isLight = theme === "light";
  const bgFill = isLight ? "#ffffff" : "#070A12";
  const gridStroke = isLight ? "#e2e8f0" : "#131c31";
  const headerBg = isLight ? "#f8fafc" : "#0b1020";
  const borderStroke = isLight ? "#cbd5e1" : "#1e293b";
  const titleFill = isLight ? "#0f172a" : "#f8fafc";
  const subTitleFill = isLight ? "#0369a1" : "#38bdf8";
  const metaFill = isLight ? "#475569" : "#94a3b8";

  const cssRules = isLight
    ? `
      .gate-body { fill: rgba(2, 132, 199, 0.08); stroke: #1e3a8a; stroke-width: 2.5; stroke-linejoin: round; }
      .gate-body.on { stroke: #0284c7; fill: rgba(2, 132, 199, 0.16); }
      .gate-extra { fill: none; stroke: #1e3a8a; stroke-width: 2.5; }
      .gate-bubble { fill: #ffffff; stroke: #1e3a8a; stroke-width: 2.5; }
      .gate-bubble.on { stroke: #0284c7; }
      .gate-label { fill: #334155; font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-anchor: middle; font-family: "JetBrains Mono", Consolas, monospace; }
      .io-box { fill: #f8fafc; stroke: #475569; stroke-width: 2.2; }
      .io-box.hi { fill: #dcfce7; stroke: #16a34a; }
      .io-box.lo { fill: #f1f5f9; stroke: #64748b; }
      .io-text { font-family: "JetBrains Mono", Consolas, monospace; font-size: 19px; font-weight: 700; text-anchor: middle; fill: #334155; }
      .io-text.hi { fill: #15803d; }
      .led-dot.hi { fill: #16a34a; }
      .led-dot.lo { fill: #cbd5e1; }
      .port { stroke-width: 2.3; }
      .port.in { fill: #ffffff; stroke: #1e3a8a; }
      .port.out { fill: #1e3a8a; stroke: #0284c7; }
      .port.out.hi { fill: #16a34a; stroke: #15803d; }
      .port.in.hi { fill: #bbf7d0; stroke: #15803d; }
      .wire { fill: none; stroke: #64748b; stroke-width: 3; }
      .wire.on { stroke: #16a34a; stroke-width: 3.2; }
      .comp-box { fill: #f8fafc; stroke: #1e3a8a; stroke-width: 2.2; }
      .comp-label { fill: #0f172a; font-size: 11px; font-weight: 700; text-anchor: middle; font-family: "JetBrains Mono", Consolas, monospace; letter-spacing: 0.6px; }
      .comp-pin-label { fill: #334155; font-size: 8.5px; font-weight: 600; font-family: "JetBrains Mono", Consolas, monospace; }
      .seg { stroke-linecap: round; }
      .seg.on { stroke: #dc2626; }
      .seg.off { stroke: #e2e8f0; }
    `
    : `
      .gate-body { fill: rgba(56, 189, 248, 0.08); stroke: #4a6fa5; stroke-width: 2.4; stroke-linejoin: round; }
      .gate-body.on { stroke: #38bdf8; fill: rgba(56, 189, 248, 0.18); }
      .gate-extra { fill: none; stroke: #4a6fa5; stroke-width: 2.4; }
      .gate-bubble { fill: #080d19; stroke: #4a6fa5; stroke-width: 2.4; }
      .gate-bubble.on { stroke: #38bdf8; }
      .gate-label { fill: #94a3b8; font-size: 11px; font-weight: 700; letter-spacing: 0.7px; text-anchor: middle; font-family: "JetBrains Mono", Consolas, monospace; }
      .io-box { fill: #101a30; stroke: #26365c; stroke-width: 2.2; }
      .io-box.hi { fill: rgba(34, 197, 94, 0.18); stroke: #22c55e; }
      .io-box.lo { fill: #101a30; stroke: #3c4c6b; }
      .io-text { font-family: "JetBrains Mono", Consolas, monospace; font-size: 19px; font-weight: 700; text-anchor: middle; fill: #94a3b8; }
      .io-text.hi { fill: #22c55e; }
      .led-dot.hi { fill: #22c55e; }
      .led-dot.lo { fill: #23303f; }
      .port { stroke-width: 2.3; }
      .port.in { fill: #0b1020; stroke: #4a6fa5; }
      .port.out { fill: #4a6fa5; stroke: #6b8fd0; }
      .port.out.hi { fill: #22c55e; stroke: #86efac; }
      .port.in.hi { fill: rgba(34, 197, 94, 0.35); stroke: #86efac; }
      .wire { fill: none; stroke: #3a4a68; stroke-width: 3; }
      .wire.on { stroke: #22c55e; stroke-width: 3.2; }
      .comp-box { fill: rgba(22, 33, 58, 0.94); stroke: #4a6fa5; stroke-width: 2.2; }
      .comp-label { fill: #e2e8f0; font-size: 11px; font-weight: 700; text-anchor: middle; font-family: "JetBrains Mono", Consolas, monospace; letter-spacing: 0.6px; }
      .comp-pin-label { fill: #8fa3c8; font-size: 8.5px; font-weight: 600; font-family: "JetBrains Mono", Consolas, monospace; }
      .seg { stroke-linecap: round; }
      .seg.on { stroke: #ef4444; }
      .seg.off { stroke: #1a2130; }
    `;

  const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">
  <defs>
    <style type="text/css"><![CDATA[
      ${cssRules}
      .rpt-title { font-family: "Chakra Petch", "Plus Jakarta Sans", system-ui, sans-serif; font-size: 16px; font-weight: 700; fill: ${titleFill}; }
      .rpt-op { font-family: "JetBrains Mono", Consolas, monospace; font-size: 12px; font-weight: 600; fill: ${subTitleFill}; }
      .rpt-meta { font-family: "JetBrains Mono", Consolas, monospace; font-size: 10.5px; fill: ${metaFill}; }
    ]]></style>
    <pattern id="export-grid" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M 22 0 L 0 0 0 22" fill="none" stroke="${gridStroke}" stroke-width="1" />
    </pattern>
  </defs>

  <!-- Canvas Background & Engineering Grid -->
  <rect x="0" y="0" width="${totalW}" height="${totalH}" fill="${bgFill}" rx="10" />
  <rect x="0" y="${headerH}" width="${totalW}" height="${contentH}" fill="url(#export-grid)" />

  <!-- Top Engineering Lab Report Title Block -->
  <rect x="0" y="0" width="${totalW}" height="${headerH}" fill="${headerBg}" />
  <line x1="0" y1="${headerH}" x2="${totalW}" y2="${headerH}" stroke="${borderStroke}" stroke-width="1.5" />
  <text x="24" y="28" class="rpt-title">DLD Circuit Schematic: ${escapeXml(circuitTitle)}</text>
  <text x="24" y="50" class="rpt-op">Synthesized Logic: ${escapeXml(circuitPatternName)}</text>
  <text x="${totalW - 24}" y="28" text-anchor="end" class="rpt-meta">Circuit &amp; Logic Lab · Dept. of Electrical Engineering</text>
  <text x="${totalW - 24}" y="50" text-anchor="end" class="rpt-meta">Nodes: ${nodes.length} · High-Resolution Lab Report Schematic</text>

  <!-- Translated Circuit Schematic Group -->
  <g transform="translate(${-worldX}, ${headerH - worldY})">
    ${innerMarkup}
  </g>

  <!-- Bottom Lab Report Attribution Footer -->
  <rect x="0" y="${headerH + contentH}" width="${totalW}" height="${footerH}" fill="${headerBg}" />
  <line x1="0" y1="${headerH + contentH}" x2="${totalW}" y2="${headerH + contentH}" stroke="${borderStroke}" stroke-width="1.5" />
  <text x="24" y="${headerH + contentH + 23}" class="rpt-meta">Built by Abdul Rauf · Electrical Engineering Workbench</text>
  <text x="${totalW - 24}" y="${headerH + contentH + 23}" text-anchor="end" class="rpt-meta">GREEN = Logic HIGH (1) · SLATE = Logic LOW (0)</text>
  <rect x="0.75" y="0.75" width="${totalW - 1.5}" height="${totalH - 1.5}" fill="none" stroke="${borderStroke}" stroke-width="1.5" rx="10" />
</svg>`;

  return { svgString, width: totalW, height: totalH };
}

function slugifyFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dld-circuit"
  );
}

export function downloadSchematicSVG(options: ExportSchematicOptions): void {
  const { svgString } = buildLabReportSVG(options);
  const blob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugifyFileName(options.circuitTitle)}-${options.theme}-schematic.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSchematicPNG(
  options: ExportSchematicOptions,
  scale = 3
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { svgString, width, height } = buildLabReportSVG(options);
    const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error("Failed to encode PNG blob"));
            return;
          }
          const pngUrl = URL.createObjectURL(pngBlob);
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `${slugifyFileName(options.circuitTitle)}-${options.theme}-schematic-3x.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
          resolve();
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
