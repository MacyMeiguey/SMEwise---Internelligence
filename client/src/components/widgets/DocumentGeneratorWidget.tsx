/**
 * DocumentGeneratorWidget — Owner Tools Section
 * Generates structured business documents using the document API, with PDF and .docx download.
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10
 *
 * Props:
 *   profile       — the submitted BusinessProfile
 *   onGenerateRef — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import { API_BASE } from "../../lib/api";

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

// ─── PDF download helper ──────────────────────────────────────────────────────

function downloadAsPdf(content: string, documentType: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 7;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(documentType, margin, y);
  y += lineHeight * 1.5;

  // Body — split into lines respecting page breaks
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = content.split("\n");
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line || " ", maxWidth) as string[];
    for (const wrappedLine of wrapped) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(wrappedLine, margin, y);
      y += lineHeight;
    }
  }

  doc.save(`${documentType.replace(/\s+/g, "_")}.pdf`);
}

// ─── .docx download helper ────────────────────────────────────────────────────

async function downloadAsDocx(content: string, documentType: string): Promise<void> {
  const lines = content.split("\n");

  const paragraphs = lines.map((line) => {
    const trimmed = line.trim();

    // Detect markdown-style headings
    if (trimmed.startsWith("### ")) {
      return new Paragraph({
        text: trimmed.slice(4),
        heading: HeadingLevel.HEADING_3,
      });
    }
    if (trimmed.startsWith("## ")) {
      return new Paragraph({
        text: trimmed.slice(3),
        heading: HeadingLevel.HEADING_2,
      });
    }
    if (trimmed.startsWith("# ")) {
      return new Paragraph({
        text: trimmed.slice(2),
        heading: HeadingLevel.HEADING_1,
      });
    }

    // Bold lines that end with a colon (section labels)
    if (trimmed.endsWith(":") && trimmed.length < 80) {
      return new Paragraph({
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }

    return new Paragraph({ text: trimmed || "" });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: documentType,
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${documentType.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DocumentGeneratorWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

// ─── Controls rendered outside WidgetCard (always visible) ───────────────────
// We need the controls to be visible even in idle/loading state, so we wrap
// the whole thing in a container and render controls above the WidgetCard.

export function DocumentGeneratorWidgetWithControls({
  profile,
  onGenerateRef,
}: DocumentGeneratorWidgetProps) {
  const { state, generate } = useWidgetState();
  const [documentType, setDocumentType] = useState<DocumentType>("Business Plan Summary");
  const [templateText, setTemplateText] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") setTemplateText(text);
      };
      reader.readAsText(file);
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    setGeneratedContent("");
    await generate(async () => {
      const res = await fetch(`${API_BASE}/api/document/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, businessProfile: profile, templateText }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? `Document generation failed: HTTP ${res.status}`);
      }
      const data = (await res.json()) as { content?: string; error?: string };
      if (!data.content) throw new Error(data.error ?? "No document content returned.");
      setGeneratedContent(data.content);
    });
  }, [profile, documentType, templateText, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  const handleDownloadPdf = useCallback(() => {
    downloadAsPdf(generatedContent, documentType);
  }, [generatedContent, documentType]);

  const handleDownloadDocx = useCallback(async () => {
    await downloadAsDocx(generatedContent, documentType);
  }, [generatedContent, documentType]);

  const fieldClass =
    "w-full px-4 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-primary-300/80 focus:border-primary-400 transition-all duration-150 " +
    "dark:border-white/[0.10] dark:bg-white/[0.06] dark:text-neutral-100";

  /** Matches WidgetCard toolkit chrome — `color-scheme` keeps native select/file inputs on-theme. */
  return (
    <article
      className="flex flex-col rounded-xl border border-neutral-200 bg-white text-neutral-800 overflow-hidden motion-safe:animate-fade-up shadow-sm [color-scheme:light] dark:[color-scheme:dark] dark:border-white/[0.09] dark:bg-[#101018] dark:text-neutral-200 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_-16px_rgba(0,0,0,0.65)]"
      aria-label="Document Generator widget"
    >
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 sm:px-5 py-3 min-h-[3rem] dark:border-white/[0.08] dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight pr-2 leading-snug dark:text-white">
          Document Generator
        </h3>
        {state.status !== "loading" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="inline-flex items-center justify-center rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold py-2 px-4 min-h-[38px] min-w-[5rem] shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
            aria-label={state.status === "idle" ? "Generate Document" : "Regenerate Document"}
          >
            {state.status === "idle" ? "Generate" : "Regenerate"}
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
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-upload"
            className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          >
            Template file
            <span className="normal-case tracking-normal font-medium text-neutral-500 dark:text-neutral-500">
              {" "}
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

      <div className="flex flex-col p-4 sm:p-5">
        {state.status === "idle" && (
          <p className="text-sm text-neutral-600 leading-relaxed dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Generate</span> drafts from your
            profile. Adjust type or template above, then export when ready.
          </p>
        )}

        {state.status === "loading" && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">Generating document…</p>
            <div className="h-3.5 rounded-lg bg-neutral-200 w-3/4 dark:bg-white/10" />
            <div className="h-3.5 rounded-lg bg-neutral-200 w-full dark:bg-white/10" />
            <div className="h-3.5 rounded-lg bg-neutral-200 w-5/6 dark:bg-white/10" />
            <div className="h-3.5 rounded-lg bg-neutral-200 w-2/3 dark:bg-white/10" />
            <span className="sr-only">Loading…</span>
          </div>
        )}

        {state.status === "success" && generatedContent && (
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-500">
              Result
            </p>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 max-h-96 overflow-y-auto overscroll-contain dark:border-white/[0.08] dark:bg-black/40">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed p-4 text-neutral-800 dark:text-neutral-200">
                {generatedContent}
              </pre>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-neutral-200 dark:hover:bg-white/[0.09] dark:focus-visible:ring-offset-[#101018]"
                aria-label="Download document as PDF"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadDocx}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#101018]"
                aria-label="Download document as Word .docx"
              >
                Download .docx
              </button>
            </div>
          </div>
        )}

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
