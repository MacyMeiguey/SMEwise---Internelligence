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

  return (
    <article
      className="flex flex-col rounded-xl border-2 border-neutral-950 bg-white"
      style={{ boxShadow: "3px 3px 0 0 #0f0f0f" }}
      aria-label="Document Generator widget"
    >
      {/* ── Card header ── */}
      <header className="flex items-center justify-between gap-4 border-b-2 border-neutral-950 px-5 py-4 bg-primary-50">
        <h3 className="text-sm font-bold text-neutral-950">Document Generator</h3>
        {state.status !== "loading" && (
          <button
            type="button"
            onClick={handleGenerate}
            className="btn-brand text-xs py-2 px-4 rounded-lg"
            aria-label={state.status === "idle" ? "Generate Document" : "Regenerate Document"}
          >
            {state.status === "idle" ? "Generate" : "Regenerate"}
          </button>
        )}
        {state.status === "loading" && (
          <span
            className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"
            role="status"
            aria-label="Generating…"
          />
        )}
      </header>

      {/* ── Controls (always visible) ── */}
      <div className="flex flex-col gap-4 border-b-2 border-neutral-100 px-5 py-4">
        {/* Document type dropdown */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="doc-type-select"
            className="text-xs font-semibold uppercase tracking-widest text-primary-700 mb-1"
          >
            Document type
          </label>
          <select
            id="doc-type-select"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="input-field text-sm py-2.5"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Optional template upload */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-upload"
            className="text-xs font-semibold uppercase tracking-widest text-primary-700 mb-1"
          >
            Template file{" "}
            <span className="normal-case tracking-normal font-medium text-neutral-500"> (optional)</span>
          </label>
          <input
            id="template-upload"
            ref={fileInputRef}
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleFileChange}
            className="text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-2 file:border-neutral-950
                       file:bg-primary-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-neutral-950
                       hover:file:bg-primary-100 focus:outline-none transition-all"
          />
          {templateText && (
            <p className="text-xs font-medium text-primary-700">
              Template loaded ({templateText.length.toLocaleString()} characters)
            </p>
          )}
        </div>
      </div>

      {/* ── Card body ── */}
      <div className="flex flex-col px-5 py-4 bg-white">
        {state.status === "idle" && (
          <p className="text-sm text-neutral-600 italic">
            Select a document type and click{" "}
            <span className="font-semibold text-primary-700 not-italic">Generate</span>{" "}
            to create your document.
          </p>
        )}

        {state.status === "loading" && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Loading">
            <p className="text-sm text-primary-700 font-semibold">Generating document…</p>
            <div className="h-4 bg-neutral-100 rounded-lg w-3/4" />
            <div className="h-4 bg-neutral-100 rounded-lg w-full" />
            <div className="h-4 bg-neutral-100 rounded-lg w-5/6" />
            <div className="h-4 bg-neutral-100 rounded-lg w-2/3" />
            <span className="sr-only">Loading…</span>
          </div>
        )}

        {state.status === "success" && generatedContent && (
          <div className="flex flex-col gap-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-900 leading-relaxed border-2 border-neutral-950 rounded-xl p-4 max-h-96 overflow-y-auto bg-primary-50/40">
              {generatedContent}
            </pre>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="btn-ghost text-sm py-2 px-4 rounded-xl border-neutral-950"
                aria-label="Download document as PDF"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadDocx}
                className="btn-primary text-sm py-2 px-4 rounded-xl"
                aria-label="Download document as Word .docx"
              >
                Download .docx
              </button>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col gap-3" role="alert" aria-live="assertive">
            <p className="text-sm text-error-700">
              {state.errorMessage ?? "Something went wrong. Please try again."}
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              className="btn-brand self-start text-sm py-2 px-4 rounded-xl"
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
