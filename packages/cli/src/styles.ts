/**
 * Terminal styling helpers — zero-dependency ANSI colors, symbols, and formatters.
 * Respects NO_COLOR env var and auto-disables on non-TTY stdout.
 * @module @openfinclaw/cli/styles
 */

/** Whether the current stdout supports ANSI color output */
const supportsColor: boolean = (() => {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(process.stdout.isTTY);
})();

/**
 * Wrap a string with ANSI SGR codes; returns plain string when color is disabled.
 * @param open - Opening SGR code(s)
 * @param close - Closing SGR code
 */
function wrap(open: string, close = "\x1b[0m") {
  return (s: string | number): string =>
    supportsColor ? `${open}${s}${close}` : String(s);
}

/**
 * Color helpers.
 *
 * Primary brand accent is Bloomberg-amber (matches the gold gradient logo in
 * `init.ts`). Use the `amber*` / `boldAmber` entries for section headers,
 * dividers and branded badges. Functional colors (green/red/yellow/cyan) keep
 * their standard semantics (success/error/warn/info).
 */
export const color = {
  dim: wrap("\x1b[2m"),
  bold: wrap("\x1b[1m"),
  italic: wrap("\x1b[3m"),
  underline: wrap("\x1b[4m"),
  red: wrap("\x1b[31m"),
  green: wrap("\x1b[32m"),
  yellow: wrap("\x1b[33m"),
  blue: wrap("\x1b[34m"),
  magenta: wrap("\x1b[35m"),
  cyan: wrap("\x1b[36m"),
  gray: wrap("\x1b[90m"),
  boldCyan: wrap("\x1b[1;36m"),
  boldGreen: wrap("\x1b[1;32m"),
  boldRed: wrap("\x1b[1;31m"),
  boldYellow: wrap("\x1b[1;33m"),
  // Bloomberg-amber accent palette (Tailwind amber 200 / 400 / 500 / 700)
  amber200: wrap("\x1b[38;2;253;230;138m"),
  amber400: wrap("\x1b[38;2;251;191;36m"),
  amber500: wrap("\x1b[38;2;245;158;11m"),
  amber700: wrap("\x1b[38;2;180;83;9m"),
  boldAmber: wrap("\x1b[1;38;2;245;158;11m"),
};

/** Unicode symbols with ASCII fallbacks */
const useUnicode = process.platform !== "win32" || Boolean(process.env.WT_SESSION);
export const sym = {
  check: useUnicode ? "✓" : "√",
  cross: useUnicode ? "✗" : "x",
  arrow: useUnicode ? "→" : "->",
  up: useUnicode ? "▲" : "^",
  down: useUnicode ? "▼" : "v",
  flat: useUnicode ? "▬" : "-",
  dot: useUnicode ? "•" : "*",
  info: useUnicode ? "ℹ" : "i",
  warn: useUnicode ? "⚠" : "!",
  bullet: useUnicode ? "▸" : ">",
  hLine: useUnicode ? "─" : "-",
  vLine: useUnicode ? "│" : "|",
  cornerTL: useUnicode ? "╭" : "+",
  cornerTR: useUnicode ? "╮" : "+",
  cornerBL: useUnicode ? "╰" : "+",
  cornerBR: useUnicode ? "╯" : "+",
};

/**
 * Get visible width of a string (ignores ANSI codes, counts CJK chars as width 2).
 * Used for manual column alignment where String.padEnd() would miscount wide chars.
 * @param s - Input string, possibly containing ANSI escapes and CJK characters
 */
export function visibleWidth(s: string): number {
  const stripped = s.replace(/\x1b\[[0-9;]*m/g, "");
  let width = 0;
  for (const ch of stripped) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs, Hiragana, Katakana, Hangul, fullwidth forms
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xa000 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Pad string on the right to a visible column width (CJK-aware, ANSI-safe).
 * @param s - Input string
 * @param width - Target visible width
 */
export function padRight(s: string, width: number): string {
  const w = visibleWidth(s);
  if (w >= width) return s;
  return s + " ".repeat(width - w);
}

/**
 * Pad string on the left to a visible column width (CJK-aware, ANSI-safe).
 * @param s - Input string
 * @param width - Target visible width
 */
export function padLeft(s: string, width: number): string {
  const w = visibleWidth(s);
  if (w >= width) return s;
  return " ".repeat(width - w) + s;
}

/**
 * Truncate string to visible column width, appending an ellipsis when cut.
 * CJK-aware but does not handle ANSI color codes inside the input.
 * @param s - Input string
 * @param width - Max visible width
 */
export function truncate(s: string, width: number): string {
  if (visibleWidth(s) <= width) return s;
  let out = "";
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    const cw =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7a3)
        ? 2
        : 1;
    if (w + cw > width - 1) break;
    out += ch;
    w += cw;
  }
  return out + "…";
}

/**
 * Colorize a percent number: green for positive, red for negative, gray for zero.
 * @param n - Percentage as a number (e.g. 12.3 for "+12.3%")
 * @param digits - Decimal places (default: 2)
 */
export function formatPercent(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return color.gray("—");
  const sign = n > 0 ? "+" : "";
  const txt = `${sign}${n.toFixed(digits)}%`;
  if (n > 0) return color.green(txt);
  if (n < 0) return color.red(txt);
  return color.gray(txt);
}

/**
 * Arrow glyph based on sign: ▲ green, ▼ red, ▬ gray.
 * @param n - Signed number
 */
export function trendArrow(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return color.gray(sym.flat);
  if (n > 0) return color.green(sym.up);
  if (n < 0) return color.red(sym.down);
  return color.gray(sym.flat);
}

/**
 * Print a styled section header with an amber underline — keeps visual parity
 * with the gold init banner. Functional accent colors (green/red/yellow) are
 * unchanged; switch back to boldCyan only if a caller needs to emphasize a
 * command name rather than a section.
 * @param title - Header text
 */
export function header(title: string): string {
  const line = sym.hLine.repeat(Math.max(visibleWidth(title), 20));
  return `\n  ${color.boldAmber(title)}\n  ${color.amber700(line)}`;
}

/**
 * Format a key-value row: amber label (padded), then bold/colored value.
 * @param label - Left-side label
 * @param value - Right-side value (already colored if needed)
 * @param labelWidth - Visible width for label column
 */
export function kv(label: string, value: string, labelWidth = 14): string {
  return `  ${color.amber400(padRight(label, labelWidth))} ${value}`;
}

/** Success line: green check + message */
export function success(msg: string): string {
  return `  ${color.green(sym.check)} ${msg}`;
}

/** Error line: red cross + message */
export function error(msg: string): string {
  return `  ${color.red(sym.cross)} ${msg}`;
}

/** Warning line: yellow triangle + message */
export function warn(msg: string): string {
  return `  ${color.yellow(sym.warn)} ${msg}`;
}

/** Info line: cyan circle + message */
export function info(msg: string): string {
  return `  ${color.cyan(sym.info)} ${msg}`;
}

/** Hint line: dim gray bullet + message — for secondary/next-step tips */
export function hint(msg: string): string {
  return `  ${color.gray(sym.bullet + " " + msg)}`;
}

/**
 * Three-line "Problem → Why → Fix" error block.
 * Use for errors where the user needs guidance to self-recover (bad config,
 * missing key, unknown command). For one-line reporting stay with `error()`.
 * @param parts.what - Short, bold problem statement (< 60 chars)
 * @param parts.why - Why it happened — often the upstream error message
 * @param parts.fix - The concrete action the user should take next
 */
export function failure(parts: { what: string; why: string; fix: string }): string {
  const lines = [
    `  ${color.red(sym.cross)} ${color.bold(parts.what)}`,
    `      ${color.gray("Why:")} ${color.gray(parts.why)}`,
    `      ${color.gray("Fix:")} ${color.cyan(parts.fix)}`,
  ];
  return lines.join("\n");
}
