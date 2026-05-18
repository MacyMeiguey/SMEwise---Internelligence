/**
 * DocumentGeneratorWidget — Owner Tools Section
 * Generates structured business documents using the ReportandDocumentGenerator
 * Bedrock Agent (POST /api/bedrock/document-generator).
 * Supports PDF and .docx export.
 */

import { useState, useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from "react";
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import { API_BASE } from "../../lib/api";
import { checkCache, writeCache, hashInputs } from "../../utils/widgetCache";
import {
  extractBalancedJsonObject,
  escapeControlCharsInJsonStrings,
  stripTrailingJsonCommas,
} from "../../utils/extractBalancedJson";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
  "Business Plan Summary",
  "SWOT Analysis",
  "Monthly Operations Report",
  "Investor Pitch Outline",
  "Staff Onboarding Checklist",
  "Marketing Brief",
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ─── Agent response shape ─────────────────────────────────────────────────────

/** Optional chart for a section — from the agent and/or derived from numeric tables */
interface SectionChartSpec {
  type: "bar" | "line";
  yAxisLabel?: string;
  series: { label: string; value: number }[];
}

interface DocumentSection {
  title: string;
  content: string | string[];
  /** Optional — agent may supply; UI can also derive from numeric pipe tables */
  chart?: SectionChartSpec;
}

interface GeneratedDocument {
  documentType: string;
  companyName: string;
  generatedAt: string;
  sections: DocumentSection[];
  disclaimer: string;
}

/** Cached owner-tool result: structured JSON and/or raw agent text */
interface DocumentGeneratorCachePayload {
  parsedDoc: GeneratedDocument | null;
  rawFallback: string;
}

const DOCUMENT_GENERATOR_CACHE_KEY = "document-generator";

// ─── Parse agent response ─────────────────────────────────────────────────────

function looksLikeAgentClarification(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    (t.includes("?") &&
      (t.includes("can you provide") ||
        t.includes("could you provide") ||
        t.includes("more details") ||
        t.includes("what type of") ||
        t.includes("please provide"))) ||
    t.startsWith("can you ") ||
    t.startsWith("could you ")
  );
}

/** Parsed grid for markdown-style "|" pipe rows inside a paragraph or bullets */
function parsePipeTableFromLines(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const rows = lines
    .filter((ln) => ln.length > 0)
    .map((ln) => ln.split("|").map((c) => c.trim()));
  const width = rows[0]?.length ?? 0;
  if (width < 2 || rows.length < 2 || !rows.every((r) => r.length === width)) return null;
  const headers = rows[0]!;
  const body = rows.slice(1);
  return { headers, rows: body };
}

type SectionLayout =
  | { type: "pipe"; headers: string[]; rows: string[][] }
  | { type: "indexed"; points: string[] }
  | { type: "prose"; paragraphs: string[] };

function analyzeSectionLayout(section: DocumentSection): SectionLayout {
  if (Array.isArray(section.content)) {
    const grids = section.content.map((item) =>
      item.split("|").map((c) => c.trim()),
    );
    const width = grids[0]?.length ?? 0;
    if (width >= 2 && grids.length >= 2 && grids.every((r) => r.length === width)) {
      const headers = grids[0]!.map((h) => (h || "—"));
      const rows = grids.slice(1).map((r) => r.map((c) => (c || "—")));
      return { type: "pipe", headers, rows };
    }
    return { type: "indexed", points: [...section.content] };
  }

  const lines = section.content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const piped = parsePipeTableFromLines(lines);
  if (piped) return { type: "pipe", headers: piped.headers, rows: piped.rows };
  const paragraphs =
    splitProseParagraphs(section.content).length > 0
      ? splitProseParagraphs(section.content)
      : [section.content.trim()].filter(Boolean);
  return { type: "prose", paragraphs };
}

function splitProseParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function parseNumericCell(s: string): number | null {
  let t = s.trim().replace(/,/g, "");
  if (/^rm\s*/i.test(t)) t = t.replace(/^rm\s*/i, "").trim();
  if (/%$/.test(t)) t = t.slice(0, -1).trim();
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function pickValueColumnIndex(headers: string[], rows: string[][]): number | null {
  if (headers.length === 0 || rows.length === 0) return null;
  const labelish = (h: string) =>
    /^(month|quarter|year|item|metric|kpi|name|label|period|category|segment)/i.test((h ?? "").trim());

  const colScore: number[] = headers.map((_, c) => {
    let ok = 0;
    for (const row of rows) {
      if (parseNumericCell(row[c] ?? "") !== null) ok++;
    }
    return rows.length ? ok / rows.length : 0;
  });

  let best: number | null = null;
  let bestScore = 0;
  for (let c = 0; c < headers.length; c++) {
    if (labelish(headers[c] ?? "")) continue;
    if (colScore[c]! > bestScore && colScore[c]! >= 0.45) {
      best = c;
      bestScore = colScore[c]!;
    }
  }
  if (best !== null) return best;
  for (let c = headers.length - 1; c >= 0; c--) {
    if (colScore[c]! >= 0.34) return c;
  }
  return null;
}

function pickLabelColumnIndex(headers: string[], valueCol: number): number {
  const candidates = [0, 1].filter((i) => i !== valueCol && i < headers.length);
  return candidates[0] ?? (valueCol === 0 ? 1 : 0);
}

/** When a pipe table has a numeric column, show a simple bar/line figure (no agent required). */
function deriveChartFromPipeTable(headers: string[], rows: string[][]): SectionChartSpec | null {
  if (headers.length < 2 || rows.length < 2) return null;
  const vi = pickValueColumnIndex(headers, rows);
  if (vi === null) return null;
  const li = pickLabelColumnIndex(headers, vi);
  const series: { label: string; value: number }[] = [];
  for (const row of rows) {
    const lab = (row[li] ?? "—").trim() || "—";
    const v = parseNumericCell(row[vi] ?? "");
    if (v === null) continue;
    const short = lab.length > 28 ? `${lab.slice(0, 26)}…` : lab;
    series.push({ label: short, value: v });
  }
  if (series.length < 2) return null;
  const hLow = `${headers[li] ?? ""} ${headers[vi] ?? ""}`.toLowerCase();
  const asLine = /month|quarter|q[1-4]|20\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|week|day|year/i.test(
    hLow,
  );
  return {
    type: asLine ? "line" : "bar",
    yAxisLabel: headers[vi],
    series,
  };
}

function normalizeAgentChart(raw: unknown): SectionChartSpec | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = o.type === "line" ? "line" : "bar";
  const seriesRaw = o.series;
  if (!Array.isArray(seriesRaw) || seriesRaw.length < 2) return null;
  const series: { label: string; value: number }[] = [];
  for (const item of seriesRaw) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const label = String(it.label ?? it.name ?? "").trim();
    const value = Number(it.value);
    if (!label || !Number.isFinite(value)) continue;
    const short = label.length > 28 ? `${label.slice(0, 26)}…` : label;
    series.push({ label: short, value });
  }
  if (series.length < 2) return null;
  const yAxisLabel =
    typeof o.yAxisLabel === "string" && o.yAxisLabel.trim() ? o.yAxisLabel.trim() : undefined;
  return { type, series, yAxisLabel };
}

/** Editorial accent — muted navy / slate / ink (not rainbow AI slabs) */
const SECTION_STYLE = [
  { bar: "bg-slate-700", badge: "bg-slate-700" },
  { bar: "bg-[#1e4976]", badge: "bg-[#1e4976]" },
  { bar: "bg-[#0f766e]", badge: "bg-[#0f766e]" },
  { bar: "bg-slate-600", badge: "bg-slate-600" },
] as const;

const CHART_AXIS_LIGHT = { tick: { fill: "#64748b", fontSize: 11 } };
const CHART_GRID_LIGHT = { stroke: "#e2e8f0", strokeDasharray: "3 3" };
const CHART_AXIS_DARK = { tick: { fill: "#cbd5e1", fontSize: 11 } };
const CHART_GRID_DARK = { stroke: "#475569", strokeDasharray: "3 3" };

function ReportPreviewRibbon() {
  return (
    <div className="absolute inset-x-0 top-0 h-24 overflow-hidden rounded-t-xl pointer-events-none opacity-95">
      <svg className="absolute inset-0 h-full w-full text-slate-400/20 dark:text-slate-500/15" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="repoRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgb(15 23 42)" stopOpacity="0.06" />
            <stop offset="50%" stopColor="rgb(30 64 175)" stopOpacity="0.07" />
            <stop offset="100%" stopColor="rgb(15 23 42)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#repoRibbonGrad)" />
        <circle cx="-2%" cy="118%" r="38%" fill="rgb(15 23 42 / 0.04)" />
      </svg>
      <div className="absolute bottom-3 left-4 right-4 h-px bg-slate-200/80 dark:bg-white/[0.08]" />
    </div>
  );
}

/** Decorative mini-chart (abstract — not live data). */
function ReportPreviewSparkGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect x="0" y="0" width="120" height="48" rx="8" fill="rgb(248 250 252 / 0.9)" className="dark:fill-neutral-950/70" />
      <rect x="10" y="26" width="16" height="16" rx="2" fill="rgb(30 64 175 / 0.88)" />
      <rect x="32" y="18" width="16" height="24" rx="2" fill="rgb(30 64 175 / 0.65)" />
      <rect x="54" y="12" width="16" height="30" rx="2" fill="rgb(30 64 175 / 0.45)" />
      <rect x="76" y="22" width="16" height="20" rx="2" fill="rgb(30 64 175 / 0.32)" />
      <polyline
        points="14,38 98,38"
        fill="none"
        stroke="rgb(100 116 139 / 0.35)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <circle cx="92" cy="10" r="3" fill="rgb(30 64 175 / 0.75)" />
    </svg>
  );
}

/** Soft line chart — pairs with bar spark for a balanced header. */
function ReportPreviewTrendGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 48"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect x="0" y="0" width="120" height="48" rx="8" fill="rgb(248 250 252 / 0.95)" className="dark:fill-neutral-950/70" />
      <path
        d="M10 34 L32 26 L54 30 L76 16 L98 22 L112 14"
        fill="none"
        stroke="rgb(37 99 235 / 0.9)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 36 L112 36"
        stroke="rgb(148 163 184 / 0.45)"
        strokeWidth="1"
      />
      <circle cx="112" cy="14" r="3" fill="rgb(30 58 138 / 0.75)" />
    </svg>
  );
}

function SectionLayoutGlyph({ type }: { type: SectionLayout["type"] }) {
  const box =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-sm dark:border-white/[0.09] dark:bg-[#1a1a22] dark:text-slate-300";
  if (type === "pipe") {
    return (
      <div className={box} title="Data table" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 6h16v12H4z" />
          <path d="M4 10h16M10 6v12" strokeDasharray="2 2" opacity="0.5" />
        </svg>
      </div>
    );
  }
  if (type === "indexed") {
    return (
      <div className={box} title="Structured list" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M9 7h11M9 12h11M9 17h11" strokeLinecap="round" />
          <path d="M5 7h.01M5 12h.01M5 17h.01" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className={box} title="Narrative" aria-hidden>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M7 8h10M7 12h8M7 16h10" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function SectionChartPanel({
  spec,
  subtitle,
}: {
  spec: SectionChartSpec;
  subtitle: string;
}) {
  const data = spec.series.map((s) => ({ name: s.label, value: s.value }));
  const isDark = useDocumentDarkClass();
  const axisTick = isDark ? CHART_AXIS_DARK.tick : CHART_AXIS_LIGHT.tick;
  const gridProps = isDark ? CHART_GRID_DARK : CHART_GRID_LIGHT;
  const fill = isDark ? "#60a5fa" : "#1e40af";
  const tooltipStyle = isDark
    ? {
        backgroundColor: "#1e293b",
        border: "1px solid #475569",
        borderRadius: "8px",
        fontSize: "12px",
        color: "#f1f5f9",
      }
    : {
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        fontSize: "12px",
      };
  const isLine = spec.type === "line";

  return (
    <div
      className="mt-4 rounded-lg border border-slate-200/90 bg-slate-50/70 p-3 dark:border-white/[0.14] dark:bg-white/[0.06]"
      role="img"
      aria-label={`Chart: ${subtitle}`}
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Figure
        </p>
        {spec.yAxisLabel ? (
          <span className="text-[10px] text-slate-500 dark:text-slate-300">Value — {spec.yAxisLabel}</span>
        ) : null}
      </div>
      <div className="h-[196px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {isLine ? (
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" tick={axisTick} interval={0} angle={-18} textAnchor="end" height={48} />
              <YAxis tick={axisTick} width={44} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={isDark ? { color: "#e2e8f0" } : { color: "#0f172a" }}
                formatter={(value: number | string) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return [
                    Number.isFinite(n) ? n.toLocaleString("en-MY") : String(value),
                    spec.yAxisLabel ?? "Value",
                  ];
                }}
              />
              <Line type="monotone" dataKey="value" stroke={fill} strokeWidth={2} dot={{ r: 3, fill }} activeDot={{ r: 4 }} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 28 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" tick={axisTick} interval={0} angle={-20} textAnchor="end" height={52} />
              <YAxis tick={axisTick} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={isDark ? { color: "#e2e8f0" } : { color: "#0f172a" }}
                formatter={(value: number | string) => {
                  const n = typeof value === "number" ? value : Number(value);
                  return [
                    Number.isFinite(n) ? n.toLocaleString("en-MY") : String(value),
                    spec.yAxisLabel ?? "Value",
                  ];
                }}
              />
              <Bar dataKey="value" fill={fill} radius={[3, 3, 0, 0]} maxBarSize={48} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function looksLikeReportJsonPayload(text: string): boolean {
  const t = text.trim();
  return (
    t.startsWith("{") &&
    t.includes('"documentType"') &&
    t.includes('"sections"') &&
    t.includes('"companyName"')
  );
}

function parseDocumentResponse(raw: string): GeneratedDocument | null {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  const jsonStr = extractBalancedJsonObject(cleaned);
  if (!jsonStr) return null;

  const candidates = [
    jsonStr,
    escapeControlCharsInJsonStrings(jsonStr),
    stripTrailingJsonCommas(escapeControlCharsInJsonStrings(jsonStr)),
  ];

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const doc = normalizeGeneratedDocument(parsed);
      if (doc) return doc;
    } catch {
      // try next repair pass
    }
  }
  return null;
}

/** Accept agent JSON even with small shape drift; ensures UI never shows raw JSON when parseable. */
function normalizeGeneratedDocument(parsed: unknown): GeneratedDocument | null {
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;
  if (typeof d.documentType !== "string" || typeof d.companyName !== "string") return null;
  const generatedAt = typeof d.generatedAt === "string" ? d.generatedAt : "";
  if (!Array.isArray(d.sections)) return null;

  const sections: DocumentSection[] = [];
  for (const item of d.sections) {
    if (!item || typeof item !== "object") return null;
    const s = item as Record<string, unknown>;
    if (typeof s.title !== "string") return null;
    const content = s.content;
    const chart =
      s.chart !== undefined && s.chart !== null
        ? normalizeAgentChart(s.chart as unknown)
        : null;
    if (typeof content === "string") {
      sections.push({
        title: s.title,
        content,
        ...(chart ? { chart } : {}),
      });
    } else if (Array.isArray(content) && content.every((x) => typeof x === "string")) {
      sections.push({
        title: s.title,
        content: content as string[],
        ...(chart ? { chart } : {}),
      });
    } else {
      return null;
    }
  }

  const disclaimer = normalizeReportDisclaimer(
    typeof d.disclaimer === "string" ? d.disclaimer : undefined,
  );

  return {
    documentType: d.documentType,
    companyName: d.companyName,
    generatedAt,
    sections,
    disclaimer,
  };
}

/** Actual generation timestamp for UI/PDF — avoids stale model dates like “May 2023”. */
function formatReportGeneratedAt(date = new Date()): string {
  return date.toLocaleString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function withFreshGeneratedAt(doc: GeneratedDocument): GeneratedDocument {
  return {
    ...doc,
    generatedAt: formatReportGeneratedAt(),
    disclaimer: normalizeReportDisclaimer(doc.disclaimer),
  };
}

function normalizeParsedDoc(doc: GeneratedDocument): GeneratedDocument {
  return { ...doc, disclaimer: normalizeReportDisclaimer(doc.disclaimer) };
}

/** Review notice only — SMEwise attribution lives in export footers, not here. */
const REPORT_DISCLAIMER_DEFAULT =
  "Review and customise this document before official use.";

const REPORT_EXPORT_ATTRIBUTION = "Generated by SMEwise AI · smewise.io";

/** Safe filename segment — no path chars, collapsed whitespace. */
function slugForExportFilename(text: string): string {
  return text
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80) || "Report";
}

function buildReportExportFilename(
  companyName: string,
  documentType: string,
  ext: "pdf" | "docx",
): string {
  const company = slugForExportFilename(companyName);
  const doc = slugForExportFilename(documentType);
  return `${company}_${doc}.${ext}`;
}

function normalizeReportDisclaimer(raw?: string): string {
  if (!raw?.trim()) return REPORT_DISCLAIMER_DEFAULT;
  let text = raw.trim().replace(/^Disclaimer:\s*/i, "").trim();
  if (/generated by\s+smewise/i.test(text) && /review and custom/i.test(text)) {
    return REPORT_DISCLAIMER_DEFAULT;
  }
  text = text
    .replace(/\s*generated by\s+smewise\s+ai[^.]*\.?/gi, "")
    .replace(/\s*ai-powered business intelligence[^.]*\.?/gi, "")
    .trim();
  if (!text) return REPORT_DISCLAIMER_DEFAULT;
  return text;
}

function subscribeHtmlDarkClass(onStoreChange: () => void): () => void {
  const el = document.documentElement;
  const mo = new MutationObserver(onStoreChange);
  mo.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

function getHtmlDarkClassSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function useDocumentDarkClass(): boolean {
  return useSyncExternalStore(subscribeHtmlDarkClass, getHtmlDarkClassSnapshot, () => false);
}

// ─── PDF download ─────────────────────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// RGB colour palette
const PDF_NAVY: [number, number, number] = [10, 20, 40];
const PDF_BLUE: [number, number, number] = [37, 99, 235];
const PDF_TEAL: [number, number, number] = [13, 148, 136];
const PDF_VIOLET: [number, number, number] = [109, 40, 217];
const PDF_SLATE: [number, number, number] = [71, 85, 105];
const PDF_BORDER: [number, number, number] = [203, 213, 225];
const PDF_LIGHT: [number, number, number] = [248, 250, 252];
const PDF_WHITE: [number, number, number] = [255, 255, 255];
const PDF_SECTION_ACCENTS: [number, number, number][] = [
  PDF_BLUE,
  PDF_TEAL,
  PDF_VIOLET,
  [51, 65, 85],
];

function pdfRowHeights(texts: string[], colWmm: number[], pdf: jsPDF, fontSize: number): number {
  pdf.setFontSize(fontSize);
  let maxH = 8;
  for (let i = 0; i < texts.length; i++) {
    const w = pdf.splitTextToSize(texts[i] ?? " ", Math.max(colWmm[i]! - 6, 10)) as string[];
    maxH = Math.max(maxH, w.length * 4.6 + 4);
  }
  return maxH;
}

async function downloadAsPdf(doc: GeneratedDocument): Promise<void> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageWidth - margin * 2;
  const footerY = pageH - 9;
  const headerBandH = 48;

  const logoBase64 = await loadImageAsBase64("/smewise-logo.png");

  let currentPage = 1;

  // ── Watermark (faint diagonal text) ─────────────────────────────
  function addWatermark(): void {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(58);
    pdf.setTextColor(232, 235, 242);
    pdf.text("SMEwise", pageWidth / 2, pageH / 2 + 8, {
      align: "center",
      angle: 45,
    });
  }

  // ── Footer (every page) ───────────────────────────────────────────
  function addFooter(): void {
    pdf.setDrawColor(...PDF_BORDER);
    pdf.setLineWidth(0.25);
    pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...PDF_SLATE);
    pdf.text(`${REPORT_EXPORT_ATTRIBUTION}  ·  ${doc.generatedAt}`, margin, footerY);
    pdf.text(`Page ${currentPage}`, pageWidth - margin, footerY, { align: "right" });
  }

  // ── Running header (pages 2+) ─────────────────────────────────────
  function addRunningHeader(): void {
    pdf.setFillColor(...PDF_NAVY);
    pdf.rect(0, 0, pageWidth, 12, "F");
    pdf.setFillColor(...PDF_BLUE);
    pdf.rect(0, 0, 3, 12, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...PDF_WHITE);
    pdf.text(doc.documentType, margin, 8);
    pdf.setFont("helvetica", "normal");
    pdf.text(doc.companyName, pageWidth - margin, 8, { align: "right" });
  }

  // ── Cover header (page 1) ─────────────────────────────────────────
  // Navy gradient band
  pdf.setFillColor(...PDF_NAVY);
  pdf.rect(0, 0, pageWidth, headerBandH, "F");
  // Left accent bar
  pdf.setFillColor(...PDF_BLUE);
  pdf.rect(0, 0, 4, headerBandH, "F");
  // Teal bottom rule
  pdf.setDrawColor(...PDF_TEAL);
  pdf.setLineWidth(1);
  pdf.line(4, headerBandH, pageWidth, headerBandH);
  // Decorative right circle
  pdf.setFillColor(20, 30, 60);
  pdf.circle(pageWidth - 6, 0, 38, "F");

  // Logo — 24 mm wide, proportionally tall (~9 mm), centred vertically in the top half of the band
  const logoW = 24;
  const logoH = 9;
  const logoX = margin + 2;
  const logoY = (headerBandH / 2 - logoH) / 2; // sits in the upper-half, well-padded
  if (logoBase64) {
    pdf.addImage(logoBase64, "PNG", logoX, logoY + 2, logoW, logoH);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...PDF_TEAL);
    pdf.text("SMEwise.", logoX, logoY + 9);
  }

  // Document title — starts just after logo area with a comfortable gap
  const titleX = logoX + logoW + 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...PDF_WHITE);
  const titleLines = pdf.splitTextToSize(doc.documentType, contentW - 50) as string[];
  let titleY = 14;
  for (const ln of titleLines) {
    pdf.text(ln, titleX, titleY);
    titleY += 6.2;
  }
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`${doc.companyName}  ·  ${doc.generatedAt}`, titleX, headerBandH - 8);

  // "AI-Generated Report" badge
  pdf.setFillColor(...PDF_TEAL);
  pdf.roundedRect(pageWidth - margin - 38, headerBandH - 16, 38, 8, 1, 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...PDF_WHITE);
  pdf.text("AI-GENERATED REPORT", pageWidth - margin - 19, headerBandH - 11, { align: "center" });

  addWatermark();
  addFooter();

  let y = headerBandH + 10;

  // ── Section content helpers ───────────────────────────────────────

  function ensureSpace(need: number): void {
    if (y + need > footerY - 6) {
      pdf.addPage();
      currentPage++;
      addWatermark();
      addRunningHeader();
      addFooter();
      y = 18;
    }
  }

  // Draw a simple bar chart with jsPDF primitives
  function drawBarChart(spec: SectionChartSpec, accent: [number, number, number]): void {
    const chartH = 54;
    const labelAreaW = 22;
    const innerW = contentW - labelAreaW;
    const innerH = chartH - 14;
    const barCount = spec.series.length;
    const maxVal = Math.max(...spec.series.map((s) => s.value), 1);
    const slotW = innerW / barCount;
    const barW = Math.min(slotW * 0.6, 18);
    const axisX = margin + labelAreaW;
    const axisBaseY = y + chartH - 10;

    ensureSpace(chartH + 6);

    // Chart background
    pdf.setFillColor(...PDF_LIGHT);
    pdf.setDrawColor(...PDF_BORDER);
    pdf.setLineWidth(0.2);
    pdf.roundedRect(margin, y, contentW, chartH, 2, 2, "FD");

    // Chart label
    if (spec.yAxisLabel) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...PDF_SLATE);
      pdf.text(spec.yAxisLabel, margin + 2, y + chartH / 2, { angle: 90, align: "center" });
    }

    // Horizontal gridlines + Y tick labels (3 levels)
    for (let t = 0; t <= 2; t++) {
      const val = Math.round((maxVal / 2) * t);
      const tickY = axisBaseY - (innerH * t) / 2;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...PDF_SLATE);
      pdf.text(val.toLocaleString("en-MY"), axisX - 2, tickY + 1, { align: "right" });
      pdf.setDrawColor(218, 224, 235);
      pdf.setLineWidth(0.2);
      pdf.line(axisX, tickY, axisX + innerW - 2, tickY);
    }

    // Axes
    pdf.setDrawColor(...PDF_SLATE);
    pdf.setLineWidth(0.4);
    pdf.line(axisX, y + 4, axisX, axisBaseY);
    pdf.line(axisX, axisBaseY, axisX + innerW - 2, axisBaseY);

    // Bars
    spec.series.forEach((s, i) => {
      const barX = axisX + i * slotW + (slotW - barW) / 2;
      const barHeight = (s.value / maxVal) * innerH;
      const barTop = axisBaseY - barHeight;

      // Main bar
      pdf.setFillColor(...accent);
      pdf.rect(barX, barTop, barW, barHeight, "F");
      // Top highlight strip
      const [r, g, b] = accent;
      pdf.setFillColor(Math.min(r + 50, 255), Math.min(g + 50, 255), Math.min(b + 60, 255));
      pdf.rect(barX, barTop, barW, 2, "F");

      // X-axis label
      const label = s.label.length > 12 ? s.label.slice(0, 11) + "…" : s.label;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(...PDF_SLATE);
      pdf.text(label, barX + barW / 2, axisBaseY + 5.5, { align: "center", angle: -28 });
    });

    y += chartH + 6;
  }

  // ── Main sections loop ────────────────────────────────────────────
  for (let si = 0; si < doc.sections.length; si++) {
    const section = doc.sections[si]!;
    const layout = analyzeSectionLayout(section);
    const agentChart = normalizeAgentChart(section.chart as unknown);
    const pipeChart =
      layout.type === "pipe" ? deriveChartFromPipeTable(layout.headers, layout.rows) : null;
    const chartSpec = agentChart ?? pipeChart;
    const accent = PDF_SECTION_ACCENTS[si % PDF_SECTION_ACCENTS.length]!;

    ensureSpace(22);

    // Section header: numbered badge + colour bar + title
    pdf.setFillColor(...accent);
    pdf.rect(margin, y, 7, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...PDF_WHITE);
    pdf.text(String(si + 1).padStart(2, "0"), margin + 1.5, y + 6.5);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(...PDF_NAVY);
    const headText = section.title.toUpperCase();
    pdf.text(headText, margin + 10, y + 7);

    // Underline matching accent colour
    pdf.setDrawColor(...accent);
    pdf.setLineWidth(0.5);
    const headTextW = Math.min(pdf.getTextWidth(headText) + 1, contentW - 10);
    pdf.line(margin + 10, y + 8.5, margin + 10 + headTextW, y + 8.5);

    y += 14;

    // Prose
    if (layout.type === "prose") {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(30, 41, 59);
      for (const p of layout.paragraphs) {
        const wrapped = pdf.splitTextToSize(p, contentW - 4) as string[];
        for (const line of wrapped) {
          ensureSpace(6);
          pdf.text(line, margin + 4, y);
          y += 5;
        }
        y += 2.5;
      }
    }

    // Indexed (numbered list)
    if (layout.type === "indexed") {
      const col0 = 12;
      const col1 = contentW - col0;
      ensureSpace(12);
      pdf.setFillColor(...accent);
      pdf.rect(margin, y, contentW, 8, "F");
      pdf.setTextColor(...PDF_WHITE);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text("#", margin + 3.5, y + 5.5);
      pdf.text("Detail", margin + col0 + 3, y + 5.5);
      y += 8;

      pdf.setTextColor(30, 41, 59);
      pdf.setFont("helvetica", "normal");
      layout.points.forEach((pt, i) => {
        const rowTexts = [(i + 1).toString(), pt];
        const rh = pdfRowHeights(rowTexts, [col0, col1], pdf, 9.5);
        ensureSpace(rh + 1);
        if (i % 2 === 0) {
          pdf.setFillColor(...PDF_LIGHT);
          pdf.rect(margin, y, contentW, rh, "F");
        }
        pdf.setDrawColor(...PDF_BORDER);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, y, contentW, rh, "S");
        pdf.setFontSize(8.5);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(...accent);
        pdf.text(`${i + 1}`, margin + 3.5, y + rh / 2 + 1.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 41, 59);
        const wraps = pdf.splitTextToSize(pt, col1 - 6) as string[];
        let yy = y + 4;
        for (const w of wraps) {
          pdf.text(w, margin + col0 + 3, yy);
          yy += 4.5;
        }
        y += rh;
      });
      y += 4;
    }

    // Pipe (table)
    if (layout.type === "pipe") {
      const cols = layout.headers.length;
      if (cols > 0) {
        const cw = contentW / cols;
        ensureSpace(12);
        pdf.setFillColor(...accent);
        pdf.rect(margin, y, contentW, 9, "F");
        pdf.setTextColor(...PDF_WHITE);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        layout.headers.forEach((h, i) => {
          const trunc = h.length > 34 ? h.slice(0, 32) + "…" : h;
          pdf.text(trunc, margin + i * cw + 3, y + 6);
        });
        y += 9;

        pdf.setTextColor(30, 41, 59);
        pdf.setFont("helvetica", "normal");
        layout.rows.forEach((row, ri) => {
          const widths = Array.from({ length: cols }, () => cw);
          const rowTexts = row.slice(0, cols).map((c) => c ?? "");
          while (rowTexts.length < cols) rowTexts.push("");
          const rh = pdfRowHeights(rowTexts, widths, pdf, 9);
          ensureSpace(rh + 1);
          if (ri % 2 === 0) {
            pdf.setFillColor(239, 246, 255);
            pdf.rect(margin, y, contentW, rh, "F");
          }
          pdf.setDrawColor(...PDF_BORDER);
          pdf.setLineWidth(0.2);
          pdf.rect(margin, y, contentW, rh, "S");
          rowTexts.forEach((cell, ci) => {
            const wraps = pdf.splitTextToSize(cell || " ", cw - 6) as string[];
            let yy = y + 4;
            for (const w of wraps) {
              pdf.text(w, margin + ci * cw + 3, yy);
              yy += 4.4;
            }
          });
          y += rh;
        });
        y += 4;
      }
    }

    // Chart
    if (chartSpec && chartSpec.series.length >= 2) {
      ensureSpace(64);
      drawBarChart(chartSpec, accent);
    }

    y += 3;
  }

  // ── Disclaimer ────────────────────────────────────────────────────
  ensureSpace(22);
  pdf.setDrawColor(...PDF_BORDER);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;
  pdf.setFillColor(...PDF_LIGHT);
  pdf.setDrawColor(...PDF_BORDER);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(margin, y, contentW, 6, 1, 1, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...PDF_SLATE);
  pdf.text("DISCLAIMER", margin + 3, y + 4);
  y += 8;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_SLATE);
  const disclaim = pdf.splitTextToSize(doc.disclaimer, contentW) as string[];
  for (const line of disclaim) {
    ensureSpace(5.5);
    pdf.text(line, margin, y);
    y += 4.8;
  }

  pdf.save(buildReportExportFilename(doc.companyName, doc.documentType, "pdf"));
}

// ─── .docx download ───────────────────────────────────────────────────────────

const DOC_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "BCCCDC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "BCCCDC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "BCCCDC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "BCCCDC" },
} as const;

const DOC_HEADER_FILL = "2563EB";

function docxTextParagraph(text: string, opts?: { bold?: boolean; color?: string }) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: Boolean(opts?.bold),
        ...(opts?.color ? { color: opts.color.replace(/^#/, "") } : {}),
      }),
    ],
  });
}

function docxParagraph(
  text: string,
  opts?: { heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]; bold?: boolean; color?: string },
) {
  if (opts?.heading != null) {
    return new Paragraph({ text, heading: opts.heading });
  }
  return docxTextParagraph(text, { bold: opts?.bold, color: opts?.color });
}

async function downloadAsDocx(doc: GeneratedDocument): Promise<void> {
  type DocChild = Paragraph | Table;

  // ── Cover ──────────────────────────────────────────────────────────────────
  const children: DocChild[] = [
    // Document type — large title
    new Paragraph({
      children: [
        new TextRun({
          text: doc.documentType,
          bold: true,
          size: 52,
          color: "0A1428",
        }),
      ],
      spacing: { before: 480, after: 160 },
    }),
    // Horizontal rule accent
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2563EB" } },
      spacing: { after: 200 },
      children: [],
    }),
    // Company name
    new Paragraph({
      children: [
        new TextRun({ text: doc.companyName, bold: true, size: 28, color: "1E3A5F" }),
      ],
      spacing: { after: 80 },
    }),
    // Generated date
    new Paragraph({
      children: [
        new TextRun({ text: doc.generatedAt, italics: true, size: 20, color: "64748B" }),
      ],
      spacing: { after: 600 },
    }),
  ];

  for (let si = 0; si < doc.sections.length; si++) {
    const section = doc.sections[si]!;
    const layout = analyzeSectionLayout(section);

    // Section number + title
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${String(si + 1).padStart(2, "0")}  `,
            bold: true,
            size: 28,
            color: "2563EB",
          }),
          new TextRun({
            text: section.title,
            bold: true,
            size: 28,
            color: "0A1428",
          }),
        ],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } },
        spacing: { before: 400, after: 160 },
      }),
    );

    if (layout.type === "prose") {
      for (const p of layout.paragraphs)
        children.push(docxTextParagraph(p));
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    const cellMargins = { top: 96, bottom: 96, left: 120, right: 120 };

    if (layout.type === "indexed") {
      const headerRow = new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          new TableCell({
            children: [docxParagraph("#", { bold: true, color: "#FFFFFF" })],
            shading: { fill: DOC_HEADER_FILL },
            margins: cellMargins,
            borders: DOC_BORDER,
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [docxParagraph("Detail", { bold: true, color: "#FFFFFF" })],
            shading: { fill: DOC_HEADER_FILL },
            margins: cellMargins,
            borders: DOC_BORDER,
            width: { size: 90, type: WidthType.PERCENTAGE },
          }),
        ],
      });
      const dataRows = layout.points.map((pt, i) => {
        const stripe = i % 2 === 0 ? "F8FAFC" : undefined;
        return new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              children: [docxParagraph(String(i + 1))],
              ...(stripe ? { shading: { fill: stripe } } : {}),
              margins: cellMargins,
              borders: DOC_BORDER,
              width: { size: 10, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [docxParagraph(pt)],
              ...(stripe ? { shading: { fill: stripe } } : {}),
              margins: cellMargins,
              borders: DOC_BORDER,
              width: { size: 90, type: WidthType.PERCENTAGE },
            }),
          ],
        });
      });

      children.push(
        new Table({
          columnWidths: [900, 8100],
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: DOC_BORDER,
          rows: [headerRow, ...dataRows],
        }),
      );
      children.push(new Paragraph({ spacing: { after: 240 } }));
      continue;
    }

    if (layout.type === "pipe") {
      const pct = layout.headers.length ? 100 / layout.headers.length : 100;
      const headerCells = layout.headers.map(
        (h) =>
          new TableCell({
            children: [docxParagraph(h, { bold: true, color: "#FFFFFF" })],
            shading: { fill: DOC_HEADER_FILL },
            margins: cellMargins,
            borders: DOC_BORDER,
            width: { size: pct, type: WidthType.PERCENTAGE },
          }),
      );

      const dataRows = layout.rows.map((row, ri) => {
        const stripe = ri % 2 === 0 ? "EFF6FF" : undefined;
        return new TableRow({
          cantSplit: true,
          children: layout.headers.map((_, ci) => {
            const txt = row[ci]?.trim() ?? "—";
            return new TableCell({
              children: [docxParagraph(txt)],
              ...(stripe ? { shading: { fill: stripe } } : {}),
              margins: cellMargins,
              borders: DOC_BORDER,
              width: { size: pct, type: WidthType.PERCENTAGE },
            });
          }),
        });
      });

      children.push(
        new Table({
          columnWidths: layout.headers.map(() => Math.round(9000 / layout.headers.length)),
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: DOC_BORDER,
          rows: [
            new TableRow({ tableHeader: true, cantSplit: true, children: headerCells }),
            ...dataRows,
          ],
        }),
      );
      children.push(new Paragraph({ spacing: { after: 240 } }));
    }
  }

  // ── Disclaimer + attribution ───────────────────────────────────────────────
  // Horizontal rule before footer
  children.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" } },
      spacing: { before: 600, after: 120 },
      children: [],
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Disclaimer  ", bold: true, size: 18, color: "475569" }),
        new TextRun({ text: doc.disclaimer, size: 18, color: "64748B", italics: true }),
      ],
      spacing: { after: 120 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${REPORT_EXPORT_ATTRIBUTION}  ·  ${doc.generatedAt}`,
          size: 17,
          color: "0D9488",
          italics: true,
        }),
      ],
    }),
  );

  const wordDoc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildReportExportFilename(doc.companyName, doc.documentType, "docx");
  a.click();
  URL.revokeObjectURL(url);
}

// ─── On-screen preview (sections) ───────────────────────────────────────────────

function ReportSectionBlock({
  section,
  index,
}: {
  section: DocumentSection;
  index: number;
}) {
  const layout = analyzeSectionLayout(section);
  const st = SECTION_STYLE[index % SECTION_STYLE.length]!;
  const agentChart = normalizeAgentChart(section.chart as unknown);
  const pipeChart =
    layout.type === "pipe" ? deriveChartFromPipeTable(layout.headers, layout.rows) : null;
  const chartSpec = agentChart ?? pipeChart;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.14] dark:bg-[#1c1c26]"
      role="group"
      aria-label={section.title}
    >
      <svg
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 text-slate-300/25 dark:text-white/[0.04]"
        viewBox="0 0 120 120"
        aria-hidden
      >
        <circle cx="96" cy="24" r="52" fill="currentColor" />
      </svg>
      <div className={`relative z-[1] h-1 w-full ${st.bar}`} />
      <div className="relative z-[1] p-4 pt-3.5">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${st.badge}`}
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <SectionLayoutGlyph type={layout.type} />
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
              {section.title}
            </p>
            <p className="mt-1 flex gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span className="rounded border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-slate-200">
                {layout.type === "pipe" ? "Table" : layout.type === "indexed" ? "List" : "Narrative"}
              </span>
            </p>
          </div>
        </div>

        <div className="relative z-[1] mt-3 space-y-4">
          {layout.type === "prose" &&
            layout.paragraphs.map((p, pi) => (
              <div
                key={pi}
                className="rounded-lg border border-slate-200/80 border-l-[3px] border-l-slate-400 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-700 dark:border-white/[0.12] dark:border-l-slate-400 dark:bg-white/[0.04] dark:text-slate-100"
              >
                {p}
              </div>
            ))}

          {layout.type === "indexed" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/85 dark:border-white/[0.12]">
              <table className="min-w-[260px] w-full border-collapse [caption-side:bottom] text-left text-sm">
                <caption className="caption-bottom border-b border-slate-100 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-slate-300">
                  {layout.points.length} item{layout.points.length === 1 ? "" : "s"}
                </caption>
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="w-11 px-3 py-2.5 text-left text-xs font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {layout.points.map((pt, i) => (
                    <tr
                      key={i}
                      className={`border-t border-slate-200/85 dark:border-white/[0.07] ${
                        i % 2 === 0 ? "bg-slate-50/90 dark:bg-white/[0.05]" : "bg-white dark:bg-transparent"
                      }`}
                    >
                      <td className="align-top px-3 py-2 font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                        {i + 1}
                      </td>
                      <td className="align-top px-3 py-2 text-slate-700 dark:text-slate-200">{pt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {layout.type === "pipe" && (
            <div className="overflow-x-auto rounded-lg border border-slate-200/85 dark:border-white/[0.12]">
              <table className="min-w-max w-full border-collapse [caption-side:bottom] text-left text-sm">
                <caption className="caption-bottom border-b border-slate-100 bg-slate-50 px-3 py-2 text-left text-[11px] font-medium text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-slate-300">
                  {layout.rows.length} × {layout.headers.length} data
                </caption>
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {layout.headers.map((h, hi) => (
                      <th key={hi} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold">
                        {h || `Column ${hi + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {layout.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className={`border-t border-slate-200/85 dark:border-white/[0.07] ${
                        ri % 2 === 0 ? "bg-slate-50/80 dark:bg-white/[0.05]" : "bg-white dark:bg-transparent"
                      }`}
                    >
                      {layout.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="max-w-[16rem] whitespace-pre-wrap px-3 py-2 align-top text-slate-700 dark:text-slate-100 sm:max-w-none"
                        >
                          {row[ci]?.trim() || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {chartSpec ? <SectionChartPanel spec={chartSpec} subtitle={section.title} /> : null}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DocumentGeneratorWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export function DocumentGeneratorWidgetWithControls({
  profile,
  onGenerateRef,
}: DocumentGeneratorWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [documentType, setDocumentType] = useState<DocumentType>("Business Plan Summary");
  const [parsedDoc, setParsedDoc] = useState<GeneratedDocument | null>(null);
  const [rawFallback, setRawFallback] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extraContextRef = useRef<HTMLTextAreaElement>(null);
  const [templateText, setTemplateText] = useState<string | null>(null);
  const [extraContext, setExtraContext] = useState("");

  const cacheInputs = useMemo(
    () => ({
      companyName: profile.companyName,
      businessType: profile.businessType,
      industry: profile.industry,
      businessStage: profile.businessStage,
      city: profile.city,
      targetCustomer: profile.targetCustomer,
      mainGoal: profile.mainGoal ?? "",
      currentFunds: profile.currentFunds,
      documentType,
      templateText: templateText ?? null,
      additionalContext: extraContext.trim(),
      forceAssumeDefaults: false,
    }),
    [
      profile.companyName,
      profile.businessType,
      profile.industry,
      profile.businessStage,
      profile.city,
      profile.targetCustomer,
      profile.mainGoal,
      profile.currentFunds,
      documentType,
      templateText,
      extraContext,
    ],
  );

  const extraContextPlaceholder = useMemo(() => {
    if (/f&b|food|beverage|restaurant|cafe|café|fnb/i.test(profile.industry)) {
      return "e.g. Halal quick-service café in KL — rice bowls, noodles, kopi; weekday B2B office lunch catering for SMEs.";
    }
    if (/retail|shop|e-?commerce/i.test(profile.industry)) {
      return "e.g. Online store selling handmade batik accessories; primary channel Shopee; average order RM 85.";
    }
    return "e.g. What you sell, who buys it, and how you deliver — anything missing from your profile.";
  }, [profile.industry]);

  useEffect(() => {
    const cached = checkCache<DocumentGeneratorCachePayload>(
      DOCUMENT_GENERATOR_CACHE_KEY,
      cacheInputs,
    );
    if (cached) {
      let doc = cached.result.parsedDoc;
      let raw = cached.result.rawFallback ?? "";
      if (!doc && raw) {
        const reparsed = parseDocumentResponse(raw);
        if (reparsed) {
          doc = reparsed;
          raw = "";
        }
      }
      setParsedDoc(doc ? normalizeParsedDoc(doc) : null);
      setRawFallback(raw);
      restoreSuccess();
    }
    // Mount-only hydrate; per-request cache is checked in handleGenerate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") setTemplateText(ev.target.result);
    };
    reader.readAsText(file);
  }, []);

  const runGenerate = useCallback(
    async (opts?: {
      bypassCache?: boolean;
      forceAssumeDefaults?: boolean;
      additionalContext?: string;
      priorAgentQuestion?: string;
    }) => {
      const contextText = (opts?.additionalContext ?? extraContext).trim();
      const assumeDefaults = Boolean(opts?.forceAssumeDefaults);
      const cacheKeyInputs = {
        ...cacheInputs,
        additionalContext: contextText,
        forceAssumeDefaults: assumeDefaults,
      };

      if (!opts?.bypassCache) {
        const cached = checkCache<DocumentGeneratorCachePayload>(
          DOCUMENT_GENERATOR_CACHE_KEY,
          cacheKeyInputs,
        );
        if (cached) {
          const cachedRaw = cached.result.rawFallback ?? "";
          if (!cached.result.parsedDoc && looksLikeAgentClarification(cachedRaw)) {
            setParsedDoc(null);
            setRawFallback(cachedRaw);
            restoreSuccess();
            return;
          }
          let doc = cached.result.parsedDoc;
          let raw = cachedRaw;
          if (!doc && raw) {
            const reparsed = parseDocumentResponse(raw);
            if (reparsed) {
              doc = withFreshGeneratedAt(reparsed);
              raw = "";
            }
          }
          setParsedDoc(doc ? normalizeParsedDoc(doc) : null);
          setRawFallback(raw);
          restoreSuccess();
          return;
        }
      }

      setParsedDoc(null);
      setRawFallback("");
      await generate(async () => {
        const res = await fetch(`${API_BASE}/api/bedrock/document-generator`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: profile.companyName,
            businessType: profile.businessType,
            industry: profile.industry,
            businessStage: profile.businessStage,
            city: profile.city,
            targetCustomer: profile.targetCustomer,
            mainGoal: profile.mainGoal,
            currentFunds: profile.currentFunds,
            documentType,
            ...(templateText ? { templateText } : {}),
            ...(contextText ? { additionalContext: contextText } : {}),
            ...(assumeDefaults ? { forceAssumeDefaults: true } : {}),
            ...(opts?.priorAgentQuestion ? { priorAgentQuestion: opts.priorAgentQuestion } : {}),
          }),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error ?? `Report generation failed: HTTP ${res.status}`);
        }

        const data = (await res.json()) as {
          content?: string;
          error?: string;
          agentAskedForInput?: boolean;
        };
        if (!data.content) throw new Error(data.error ?? "No report content returned.");

        const parsed = parseDocumentResponse(data.content);
        const isClarification =
          Boolean(data.agentAskedForInput) || looksLikeAgentClarification(data.content);

        if (parsed) {
          const stamped = withFreshGeneratedAt(parsed);
          setParsedDoc(stamped);
          setRawFallback("");
          writeCache(DOCUMENT_GENERATOR_CACHE_KEY, hashInputs(cacheKeyInputs), {
            parsedDoc: stamped,
            rawFallback: "",
          });
          return;
        }

        setRawFallback(data.content);
        if (!isClarification) {
          writeCache(DOCUMENT_GENERATOR_CACHE_KEY, hashInputs(cacheKeyInputs), {
            parsedDoc: null,
            rawFallback: data.content,
          });
        }
      });
    },
    [profile, documentType, templateText, extraContext, generate, restoreSuccess, cacheInputs],
  );

  const handleGenerate = useCallback(() => runGenerate(), [runGenerate]);

  const handleGenerateWithDetails = useCallback(() => {
    if (!extraContext.trim()) return;
    void runGenerate({
      bypassCache: true,
      additionalContext: extraContext.trim(),
      priorAgentQuestion: looksLikeAgentClarification(rawFallback) ? rawFallback : undefined,
    });
  }, [runGenerate, extraContext, rawFallback]);

  const handleUseDefaults = useCallback(() => {
    void runGenerate({
      bypassCache: true,
      forceAssumeDefaults: true,
      priorAgentQuestion: looksLikeAgentClarification(rawFallback) ? rawFallback : undefined,
    });
  }, [runGenerate, rawFallback]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  const fieldClass =
    "w-full px-4 py-2.5 rounded-xl border text-sm font-medium shadow-sm " +
    "border-neutral-400 bg-white text-neutral-900 " +
    "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition-all duration-150 " +
    "dark:border-neutral-500 dark:bg-[#1e1e2a] dark:text-neutral-100 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] " +
    "dark:focus:ring-primary-400/55 dark:focus:border-primary-300 " +
    "[color-scheme:light] dark:[color-scheme:dark]";

  const optionClass =
    "bg-white text-neutral-900 dark:bg-[#1e1e2a] dark:text-neutral-100";

  const hasResult = state.status === "success" && (parsedDoc !== null || rawFallback !== "");
  const needsMoreInfo =
    state.status === "success" && !parsedDoc && rawFallback && looksLikeAgentClarification(rawFallback);

  useEffect(() => {
    if (!needsMoreInfo) return;
    extraContextRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    extraContextRef.current?.focus({ preventScroll: true });
  }, [needsMoreInfo]);

  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm [color-scheme:light] dark:[color-scheme:dark] dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label="Report generator widget"
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base" aria-hidden="true">📄</span>
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight leading-snug dark:text-white truncate">
            Report generator
          </h3>
        </div>
        {state.status !== "loading" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
            aria-label={hasResult ? "Regenerate report" : "Generate report"}
          >
            {hasResult ? "Regenerate" : "Generate"}
          </button>
        )}
        {state.status === "loading" && (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-400 border-t-transparent"
            role="status"
            aria-label="Generating…"
          />
        )}
      </header>

      {/* ── Controls ── */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-100/80 px-4 sm:px-5 py-4 dark:border-white/[0.08] dark:bg-black/30">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="report-brief-select"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            Report to generate
          </label>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 -mt-0.5">
            Business brief (e.g. plan, SWOT) — not PDF or Word. Export format is chosen after you generate.
          </p>
          <select
            id="report-brief-select"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={fieldClass}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type} className={optionClass}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div
          className={`flex flex-col gap-1.5 rounded-xl transition-shadow ${
            needsMoreInfo ? "ring-2 ring-amber-400/70 ring-offset-2 ring-offset-neutral-100 dark:ring-offset-[#101018] p-1 -m-1" : ""
          }`}
        >
          <label
            htmlFor="report-extra-context"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            Products &amp; services
            <span className="normal-case tracking-normal font-medium text-neutral-500 dark:text-neutral-500">
              {needsMoreInfo ? " (required to continue)" : " (optional)"}
            </span>
          </label>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 -mt-0.5">
            Add specifics if your industry label is broad — it helps produce a sharper report.
          </p>
          <textarea
            id="report-extra-context"
            ref={extraContextRef}
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder={extraContextPlaceholder}
            rows={needsMoreInfo ? 4 : 3}
            aria-invalid={needsMoreInfo && !extraContext.trim() ? true : undefined}
            className={`${fieldClass} resize-y min-h-[4.5rem]`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-upload"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          >
            Reference file{" "}
            <span className="normal-case tracking-normal font-medium text-neutral-500 dark:text-neutral-500">
              (optional)
            </span>
          </label>
          <input
            id="template-upload"
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleFileChange}
            className="w-full min-w-0 text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border file:border-neutral-300 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-neutral-800 hover:file:bg-neutral-100 focus:outline-none transition-all dark:text-neutral-400 dark:file:border-white/[0.12] dark:file:bg-white/[0.06] dark:file:text-neutral-200 dark:hover:file:bg-white/[0.09]"
          />
          {templateText && (
            <p className="text-xs font-medium text-primary-700 dark:text-primary-300">
              Template loaded ({templateText.length.toLocaleString()} characters)
            </p>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col p-4 sm:p-5">

        {/* Idle */}
        {state.status === "idle" && (
          <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Choose a report brief</span>{" "}
            and add products &amp; services if your industry is broad (e.g. F&amp;B). Then hit Generate — download
            as PDF or Word when it&apos;s ready.
          </p>
        )}

        {/* Loading */}
        {state.status === "loading" && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Generating report">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              Generating {documentType}…
            </p>
            {[3, 4, 3, 5, 4].map((w, i) => (
              <div
                key={i}
                className={`h-3 rounded-lg bg-neutral-200 dark:bg-white/10`}
                style={{ width: `${w * 20}%` }}
              />
            ))}
            <span className="sr-only">Loading…</span>
          </div>
        )}

        {/* Success — structured JSON */}
        {state.status === "success" && parsedDoc && (
          <div className="flex flex-col gap-6">

            {/* ── Hero card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-[#0f172a] dark:border-white/[0.12] dark:from-[#14141e] dark:to-[#0c0c14]">
              <ReportPreviewRibbon />
              {/* left colour accent */}
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500 via-teal-500 to-violet-600" />
              <div className="relative z-[1] flex flex-col gap-5 px-5 pb-6 pt-12 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pt-14">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-400/90">
                    {parsedDoc.companyName}
                  </p>
                  <h4 className="mt-2 text-[1.15rem] font-bold leading-snug tracking-tight text-white">
                    {parsedDoc.documentType}
                  </h4>
                  <p className="mt-1.5 text-[11px] font-medium text-slate-400">
                    {parsedDoc.generatedAt}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                  <div className="flex items-end gap-2">
                    <ReportPreviewSparkGraphic className="h-[3.2rem] w-[7.6rem]" />
                    <ReportPreviewTrendGraphic className="h-[3.2rem] w-[7.6rem]" />
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {parsedDoc.sections.length} sections
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-[11px] font-semibold text-teal-300">
                      PDF &amp; Word ready
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Report body ── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Report sections</span>
                <span className="flex-1 border-t border-slate-200 dark:border-white/[0.08]" />
              </div>
              {parsedDoc.sections.map((section, si) => (
                <ReportSectionBlock key={`${si}-${section.title}`} section={section} index={si} />
              ))}
            </div>

            {/* ── Disclaimer ── */}
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/[0.09] dark:bg-white/[0.04]">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Disclaimer</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 italic dark:text-slate-400">
                  {parsedDoc.disclaimer}
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  {REPORT_EXPORT_ATTRIBUTION} · {parsedDoc.generatedAt}
                </p>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex flex-col gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Download report
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => void downloadAsPdf(parsedDoc)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/[0.15] dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:border-primary-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-300 dark:focus-visible:ring-offset-[#101018]"
                  aria-label="Download report as PDF"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
                    <rect x="5" y="3" width="14" height="11" rx="1.5" strokeLinejoin="round" />
                  </svg>
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => void downloadAsDocx(parsedDoc)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/[0.15] dark:bg-white/[0.06] dark:text-neutral-100 dark:hover:border-primary-400 dark:hover:bg-primary-500/10 dark:hover:text-primary-300 dark:focus-visible:ring-offset-[#101018]"
                  aria-label="Download report as Word .docx"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
                    <rect x="5" y="3" width="14" height="11" rx="1.5" strokeLinejoin="round" />
                  </svg>
                  Word (.docx)
                </button>
              </div>
            </div>
          </div>
        )}

        {needsMoreInfo && (
          <div className="flex flex-col gap-4"
            role="status"
            aria-live="polite"
            aria-labelledby="report-needs-detail-heading"
          >
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 dark:border-amber-500/35 dark:bg-amber-950/30">
              <p
                id="report-needs-detail-heading"
                className="text-sm font-semibold text-amber-900 dark:text-amber-100"
              >
                A few more details will unlock your report
              </p>
              <p className="mt-1.5 text-sm text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                Your profile shows <strong>{profile.industry}</strong> for {profile.companyName}, but not
                what you actually sell. Add products &amp; services above, or let us fill in sensible
                defaults for a Malaysian SME.
              </p>
              <blockquote className="mt-3 border-l-2 border-amber-300/80 pl-3 text-sm italic text-amber-900/85 dark:border-amber-500/50 dark:text-amber-100/90">
                {rawFallback}
              </blockquote>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleGenerateWithDetails}
                disabled={!extraContext.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
                aria-label="Generate report using the details you entered"
              >
                Generate report with these details
              </button>
              <button
                type="button"
                onClick={handleUseDefaults}
                className="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:bg-white/[0.09]"
                aria-label="Generate report using smart industry defaults"
              >
                Use smart defaults instead
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
              Smart defaults invent a plausible menu or service line for {profile.industry} in{" "}
              {profile.city} and label assumptions in the report.
            </p>
          </div>
        )}

        {/* Success — could not format as report (non-clarification) */}
        {state.status === "success" && !parsedDoc && rawFallback && !needsMoreInfo && (
          <div className="flex flex-col gap-3">
            {looksLikeReportJsonPayload(rawFallback) ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/35 dark:bg-amber-950/30">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Report data was received but could not be formatted
                </p>
                <p className="mt-1.5 text-sm text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
                  The model returned JSON with invalid formatting (often line breaks inside text fields).
                  Click <strong>Regenerate</strong> to try again.
                </p>
                <button
                  type="button"
                  onClick={() => void runGenerate({ bypassCache: true })}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors"
                >
                  Regenerate report
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                  Result
                </p>
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-black/40">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 text-neutral-800 dark:text-neutral-200">
                    {rawFallback}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const pdf = new jsPDF({ unit: "mm", format: "a4" });
                      const lines = rawFallback.split("\n");
                      let y = 20;
                      pdf.setFontSize(11);
                      for (const line of lines) {
                        const wrapped = pdf.splitTextToSize(line || " ", 180) as string[];
                        for (const w of wrapped) {
                          if (y > 275) { pdf.addPage(); y = 20; }
                          pdf.text(w, 15, y);
                          y += 7;
                        }
                      }
                      pdf.save(buildReportExportFilename(profile.companyName, documentType, "pdf"));
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-neutral-200"
                    aria-label="Download as PDF"
                  >
                    ↓ PDF
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {state.status === "error" && (
          <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 dark:text-red-300 dark:bg-red-950/40 dark:border-red-500/30">
              {state.errorMessage ?? "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="self-start inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold py-2 px-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
              aria-label="Retry generating report"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
