#!/usr/bin/env node
/**
 * Generate `imgs/logo.svg` as a font-independent pixel-grid SVG.
 *
 * The ANSI-Shadow banner used by `openfinclaw init` relies on monospace
 * box-drawing glyphs (█╔═╗╚╝║). Browsers render those characters with
 * wildly different metrics than the terminal's SF Mono, so text-based
 * SVGs fragment on GitHub. This script walks the 6×90 banner grid and
 * emits one `<rect>` per filled cell, coloured by row, producing a
 * deterministic pixel logo that renders identically anywhere.
 *
 * Palette mirrors `gradientLines` in `packages/cli/src/init.ts`
 * (Tailwind amber 200–800) so terminal and README stay in sync.
 * @module scripts/generate-logo-svg
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BIG_BANNER_LINES = [
  " ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗███╗   ██╗ ██████╗██╗      █████╗ ██╗    ██╗",
  "██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║████╗  ██║██╔════╝██║     ██╔══██╗██║    ██║",
  "██║   ██║██████╔╝█████╗  ██╔██╗ ██║█████╗  ██║██╔██╗ ██║██║     ██║     ███████║██║ █╗ ██║",
  "██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔══╝  ██║██║╚██╗██║██║     ██║     ██╔══██║██║███╗██║",
  "╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║██║ ╚████║╚██████╗███████╗██║  ██║╚███╔███╔╝",
  " ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ",
];

const PALETTE = ["#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#92400e"];

const CELL_W = 12;
const CELL_H = 20;
const COLS = Math.max(...BIG_BANNER_LINES.map((l) => [...l].length));
const ROWS = BIG_BANNER_LINES.length;

/**
 * `█` is the letter body (full-opacity). Box-drawing glyphs ╔╗╚╝═║ form the
 * ANSI-Shadow depth behind each letter and render as low-opacity same-hue rects
 * so the shadow reads as a subtle halo, not a solid smear.
 * @returns SVG document string
 */
function buildSvg() {
  const width = COLS * CELL_W;
  const height = ROWS * CELL_H;
  const bodyRects = [];
  const shadowRects = [];

  for (let r = 0; r < ROWS; r++) {
    const row = [...BIG_BANNER_LINES[r]];
    const fill = PALETTE[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === " ") continue;
      const x = c * CELL_W;
      const y = r * CELL_H;
      const rect = `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fill}"`;
      if (ch === "█") {
        bodyRects.push(`${rect}/>`);
      } else {
        shadowRects.push(`${rect} opacity="0.35"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="OpenFinClaw">
  <title>OpenFinClaw</title>
  ${shadowRects.join("\n  ")}
  ${bodyRects.join("\n  ")}
</svg>
`;
}

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(rootDir, "imgs", "logo.svg");
writeFileSync(outPath, buildSvg());
console.log(`Wrote ${outPath} (${COLS}×${ROWS} grid, cell ${CELL_W}×${CELL_H})`);
