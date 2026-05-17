/**
 * DocumentGeneratorWidget — Owner Tools Section
 * Generates structured business documents using the ReportandDocumentGenerator
 * Bedrock Agent (POST /api/bedrock/document-generator).
 * Supports PDF and .docx export.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { jsPDF } from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import { API_BASE } from "../../lib/api";
import { checkCache, writeCache, hashInputs } from "../../utils/widgetCache";

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

interface DocumentSection {
  title: string;
  content: string | string[];
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

function parseDocumentResponse(raw: string): GeneratedDocument | null {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
    return JSON.parse(cleaned) as GeneratedDocument;
  } catch {
    return null;
  }
}

// ─── PDF download ─────────────────────────────────────────────────────────────

function downloadAsPdf(doc: GeneratedDocument): void {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const lineH = 7;
  let y = 20;

  const addLine = (text: string, size = 11, bold = false) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const wrapped = pdf.splitTextToSize(text || " ", maxWidth) as string[];
    for (const line of wrapped) {
      if (y > 275) { pdf.addPage(); y = 20; }
      pdf.text(line, margin, y);
      y += lineH;
    }
  };

  addLine(doc.documentType, 16, true);
  addLine(`${doc.companyName} — ${doc.generatedAt}`, 10);
  y += lineH * 0.5;

  for (const section of doc.sections) {
    y += lineH * 0.5;
    addLine(section.title, 12, true);
    if (Array.isArray(section.content)) {
      for (const item of section.content) addLine(`• ${item}`);
    } else {
      addLine(section.content);
    }
  }

  y += lineH;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(120);
  const disclaimerLines = pdf.splitTextToSize(doc.disclaimer, maxWidth) as string[];
  for (const line of disclaimerLines) {
    if (y > 275) { pdf.addPage(); y = 20; }
    pdf.text(line, margin, y);
    y += lineH;
  }

  pdf.save(`${doc.documentType.replace(/\s+/g, "_")}.pdf`);
}

// ─── .docx download ───────────────────────────────────────────────────────────

async function downloadAsDocx(doc: GeneratedDocument): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({ text: doc.documentType, heading: HeadingLevel.TITLE }),
    new Paragraph({
      children: [new TextRun({ text: `${doc.companyName} — ${doc.generatedAt}`, italics: true })],
    }),
    new Paragraph({ text: "" }),
  ];

  for (const section of doc.sections) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_2 }));
    if (Array.isArray(section.content)) {
      for (const item of section.content) {
        children.push(new Paragraph({ text: `• ${item}` }));
      }
    } else {
      children.push(new Paragraph({ text: section.content }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: doc.disclaimer, italics: true, color: "888888" })],
    })
  );

  const wordDoc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(wordDoc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.documentType.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
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
  const [templateText, setTemplateText] = useState<string | null>(null);

  const cacheInputs = useMemo(
    () => ({
      companyName: profile.companyName,
      businessType: profile.businessType,
      industry: profile.industry,
      businessStage: profile.businessStage,
      city: profile.city,
      targetCustomer: profile.targetCustomer,
      mainGoal: profile.mainGoal ?? "",
      documentType,
      templateText: templateText ?? null,
    }),
    [
      profile.companyName,
      profile.businessType,
      profile.industry,
      profile.businessStage,
      profile.city,
      profile.targetCustomer,
      profile.mainGoal,
      documentType,
      templateText,
    ],
  );

  useEffect(() => {
    const cached = checkCache<DocumentGeneratorCachePayload>(
      DOCUMENT_GENERATOR_CACHE_KEY,
      cacheInputs,
    );
    if (cached) {
      setParsedDoc(cached.result.parsedDoc);
      setRawFallback(cached.result.rawFallback ?? "");
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

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<DocumentGeneratorCachePayload>(
      DOCUMENT_GENERATOR_CACHE_KEY,
      cacheInputs,
    );
    if (cached) {
      setParsedDoc(cached.result.parsedDoc);
      setRawFallback(cached.result.rawFallback ?? "");
      restoreSuccess();
      return;
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
          documentType,
          ...(templateText ? { templateText } : {}),
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? `Document generation failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { content?: string; error?: string };
      if (!data.content) throw new Error(data.error ?? "No document content returned.");

      const parsed = parseDocumentResponse(data.content);
      if (parsed) {
        setParsedDoc(parsed);
        writeCache(DOCUMENT_GENERATOR_CACHE_KEY, hashInputs(cacheInputs), {
          parsedDoc: parsed,
          rawFallback: "",
        });
      } else {
        // Agent returned non-JSON — show raw text as fallback
        setRawFallback(data.content);
        writeCache(DOCUMENT_GENERATOR_CACHE_KEY, hashInputs(cacheInputs), {
          parsedDoc: null,
          rawFallback: data.content,
        });
      }
    });
  }, [profile, documentType, templateText, generate, restoreSuccess, cacheInputs]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  const fieldClass =
    "w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-primary-300/80 focus:border-primary-400 transition-all duration-150 " +
    "dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-neutral-100";

  const hasResult = state.status === "success" && (parsedDoc !== null || rawFallback !== "");

  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm [color-scheme:light] dark:[color-scheme:dark] dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label="Document Generator widget"
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base" aria-hidden="true">📄</span>
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight leading-snug dark:text-white truncate">
            Document Generator
          </h3>
        </div>
        {state.status !== "loading" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
            aria-label={hasResult ? "Regenerate document" : "Generate document"}
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
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-50/50 px-4 sm:px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="doc-type-select"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          >
            Document type
          </label>
          <select
            id="doc-type-select"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className={fieldClass}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-upload"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          >
            Template file{" "}
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
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Select a document type</span>{" "}
            above and hit Generate. Your business profile is used automatically.
          </p>
        )}

        {/* Loading */}
        {state.status === "loading" && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Generating document">
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
          <div className="flex flex-col gap-4">
            {/* Document header */}
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
                {parsedDoc.documentType}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500">
                {parsedDoc.companyName} · {parsedDoc.generatedAt}
              </p>
            </div>

            {/* Sections */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 divide-y divide-neutral-200 max-h-[32rem] overflow-y-auto overscroll-contain dark:border-white/[0.08] dark:bg-black/40 dark:divide-white/[0.06]">
              {parsedDoc.sections.map((section) => (
                <div key={section.title} className="px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5 dark:text-neutral-300">
                    {section.title}
                  </p>
                  {Array.isArray(section.content) ? (
                    <ul className="space-y-1">
                      {section.content.map((item, i) => (
                        <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="text-primary-500 shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-700 leading-relaxed dark:text-neutral-300">
                      {section.content}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-[11px] text-neutral-400 italic dark:text-neutral-500">
              {parsedDoc.disclaimer}
            </p>

            {/* Export buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => downloadAsPdf(parsedDoc)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:bg-white/[0.09] dark:focus-visible:ring-offset-[#101018]"
                aria-label="Download document as PDF"
              >
                ↓ PDF
              </button>
              <button
                type="button"
                onClick={() => downloadAsDocx(parsedDoc)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
                aria-label="Download document as Word .docx"
              >
                ↓ Word (.docx)
              </button>
            </div>
          </div>
        )}

        {/* Success — raw text fallback (agent didn't return JSON) */}
        {state.status === "success" && !parsedDoc && rawFallback && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
              Result
            </p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 max-h-96 overflow-y-auto overscroll-contain dark:border-white/[0.08] dark:bg-black/40">
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
                  pdf.save(`${documentType.replace(/\s+/g, "_")}.pdf`);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-neutral-200"
                aria-label="Download as PDF"
              >
                ↓ PDF
              </button>
            </div>
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
              aria-label="Retry generating document"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
