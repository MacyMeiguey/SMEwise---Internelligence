import { useState } from "react";

// ─── Types (mirrors the strict JSON schema the agent outputs) ─────────────────

export interface Tactic {
  channel: string;
  action: string;
  amount: number;
}

export interface Phase {
  phaseNumber: number;
  name: string;
  timeline: string;
  overview: string;
  budgetAmount: number;
  budgetPercentage: number;
  tactics: Tactic[];
}

export interface MarketingPlan {
  company: string;
  industry: string;
  location: string;
  totalBudget: number;
  currency: string;
  duration: string;
  phases: Phase[];
}

// ─── Demo data (replace with your agent's JSON output) ───────────────────────

const DEMO_PLAN: MarketingPlan = {
  company: "Pixel Perfect",
  industry: "Camera & Photography",
  location: "Kuala Lumpur",
  totalBudget: 24000,
  currency: "RM",
  duration: "12 Months",
  phases: [
    {
      phaseNumber: 1,
      name: "Awareness",
      timeline: "Month 1–3",
      overview: "Build brand presence and reach photography enthusiasts across KL through digital and offline channels.",
      budgetAmount: 9000,
      budgetPercentage: 37.5,
      tactics: [
        { channel: "Facebook/Instagram Ads", action: "Run targeted ads to photography & videography enthusiasts in KL", amount: 5000 },
        { channel: "Influencer Collaboration", action: "Partner with 2–3 local KL photography influencers for product showcases", amount: 3000 },
        { channel: "Google My Business", action: "Set up and optimise GMB listing with photos, reviews, and posts", amount: 1000 },
      ],
    },
    {
      phaseNumber: 2,
      name: "Engagement",
      timeline: "Month 4–6",
      overview: "Deepen relationships with potential customers through community building and interactive touchpoints.",
      budgetAmount: 4000,
      budgetPercentage: 16.7,
      tactics: [
        { channel: "WhatsApp Business", action: "Launch broadcast list for product tips and personalised support", amount: 1000 },
        { channel: "Local Events", action: "Host 2 photography workshops at co-working spaces in Bangsar/TTDI", amount: 2000 },
        { channel: "Local Partnerships", action: "Partner with photography clubs (e.g. KL Photography Society) for cross-promo", amount: 1000 },
      ],
    },
    {
      phaseNumber: 3,
      name: "Conversion",
      timeline: "Month 7–9",
      overview: "Drive direct sales through optimised digital storefronts and targeted performance campaigns.",
      budgetAmount: 8000,
      budgetPercentage: 33.3,
      tactics: [
        { channel: "Shopee/Lazada", action: "Open official store, run Shopee Ads and participate in 11.11 campaigns", amount: 3000 },
        { channel: "Facebook/Instagram Ads", action: "Retargeting ads with product demos and limited-time Raya/Merdeka promos", amount: 4000 },
        { channel: "Flyers & Posters", action: "Distribute at photography studios and camera shops in KL city centre", amount: 1000 },
      ],
    },
    {
      phaseNumber: 4,
      name: "Retention",
      timeline: "Month 10–12",
      overview: "Maximise customer lifetime value through loyalty programmes and continuous feedback loops.",
      budgetAmount: 3000,
      budgetPercentage: 12.5,
      tactics: [
        { channel: "Email Marketing", action: "Monthly newsletter with exclusive discounts, tips, and new arrivals", amount: 1000 },
        { channel: "Loyalty Programme", action: "Points-based system with referral bonuses for repeat customers", amount: 1000 },
        { channel: "Community Building", action: "Create private Facebook Group for customers; gather feedback via surveys", amount: 1000 },
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_COLORS = [
  { bg: "#EAF3DE", border: "#639922", text: "#3B6D11", badge: "#C0DD97" },
  { bg: "#E6F1FB", border: "#378ADD", text: "#185FA5", badge: "#B5D4F4" },
  { bg: "#FAEEDA", border: "#BA7517", text: "#854F0B", badge: "#FAC775" },
  { bg: "#FBEAF0", border: "#D4537E", text: "#993556", badge: "#F4C0D1" },
];

const fmt = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en-MY")}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseRow({ phase, currency, isOpen, onToggle }: {
  phase: Phase;
  currency: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const c = PHASE_COLORS[(phase.phaseNumber - 1) % PHASE_COLORS.length];

  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderRadius: 12,
      overflow: "hidden",
      background: "#fff",
      transition: "box-shadow 0.15s",
    }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "40px 1fr auto auto",
          alignItems: "center",
          gap: 16,
          padding: "14px 20px",
          background: c.bg,
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Phase badge */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: c.badge, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 14, color: c.text,
          flexShrink: 0,
        }}>
          P{phase.phaseNumber}
        </div>

        {/* Name + timeline */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>
            Phase {phase.phaseNumber}: {phase.name}
          </div>
          <div style={{ fontSize: 12, color: c.text, marginTop: 2 }}>
            {phase.timeline}
          </div>
        </div>

        {/* Budget pill */}
        <div style={{
          background: c.badge, borderRadius: 20,
          padding: "4px 14px", fontSize: 13,
          fontWeight: 600, color: c.text, whiteSpace: "nowrap",
        }}>
          {fmt(phase.budgetAmount, currency)}
          <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 4 }}>
            ({phase.budgetPercentage}%)
          </span>
        </div>

        {/* Chevron */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={c.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div style={{ padding: "0 20px 20px" }}>
          {/* Overview */}
          <p style={{
            fontSize: 13, color: "#555", margin: "16px 0 14px",
            lineHeight: 1.6, borderLeft: `3px solid ${c.border}`,
            paddingLeft: 12,
          }}>
            {phase.overview}
          </p>

          {/* Tactics table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: c.bg }}>
                <th style={th}>Channel</th>
                <th style={th}>Action</th>
                <th style={{ ...th, textAlign: "right" }}>Budget</th>
              </tr>
            </thead>
            <tbody>
              {phase.tactics.map((t, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    <span style={{
                      background: c.badge, color: c.text,
                      padding: "2px 8px", borderRadius: 4,
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {t.channel}
                    </span>
                  </td>
                  <td style={{ ...td, color: "#333", lineHeight: 1.5 }}>{t.action}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600, color: c.text, whiteSpace: "nowrap" }}>
                    {fmt(t.amount, currency)}
                  </td>
                </tr>
              ))}
              <tr style={{ background: c.bg }}>
                <td colSpan={2} style={{ ...td, fontWeight: 700 }}>Phase Total</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700, color: c.text, whiteSpace: "nowrap" }}>
                  {fmt(phase.budgetAmount, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketingPlan({ plan = DEMO_PLAN }: { plan?: MarketingPlan }) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set([1]));

  const toggle = (n: number) => setOpenPhases(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });

  const expandAll = () => setOpenPhases(new Set(plan.phases.map(p => p.phaseNumber)));
  const collapseAll = () => setOpenPhases(new Set());

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 820, margin: "0 auto", padding: "24px 16px" }}>

      {/* Header card */}
      <div style={{
        background: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 14, padding: "20px 24px", marginBottom: 20,
        display: "grid", gridTemplateColumns: "1fr auto",
        alignItems: "start", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: "#888", textTransform: "uppercase", marginBottom: 4 }}>
            Long-Term Marketing Plan
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111" }}>{plan.company}</h1>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            {plan.industry} · {plan.location} · {plan.duration}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Total Budget</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#111" }}>{fmt(plan.totalBudget, plan.currency)}</div>
          <div style={{ fontSize: 12, color: "#999" }}>{plan.phases.length} phases</div>
        </div>
      </div>

      {/* Budget bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden" }}>
          {plan.phases.map((p, i) => (
            <div
              key={i}
              title={`Phase ${p.phaseNumber}: ${p.budgetPercentage}%`}
              style={{
                width: `${p.budgetPercentage}%`,
                background: PHASE_COLORS[i % PHASE_COLORS.length].border,
                transition: "width 0.3s",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
          {plan.phases.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: PHASE_COLORS[i % PHASE_COLORS.length].border, display: "inline-block" }} />
              Phase {p.phaseNumber}: {p.name} ({p.budgetPercentage}%)
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, justifyContent: "flex-end" }}>
        {[["Expand All", expandAll], ["Collapse All", collapseAll]].map(([label, fn]) => (
          <button
            key={label as string}
            onClick={fn as () => void}
            style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 6,
              border: "1px solid #d1d5db", background: "#fff",
              cursor: "pointer", color: "#444",
            }}
          >
            {label as string}
          </button>
        ))}
      </div>

      {/* Phase rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {plan.phases.map(phase => (
          <PhaseRow
            key={phase.phaseNumber}
            phase={phase}
            currency={plan.currency}
            isOpen={openPhases.has(phase.phaseNumber)}
            onToggle={() => toggle(phase.phaseNumber)}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 20, padding: "14px 20px",
        background: "#f9fafb", borderRadius: 10,
        display: "flex", justifyContent: "space-between",
        fontSize: 13, color: "#555", flexWrap: "wrap", gap: 8,
      }}>
        <span>Total allocated across all phases</span>
        <strong style={{ color: "#111" }}>
          {fmt(plan.phases.reduce((s, p) => s + p.budgetAmount, 0), plan.currency)}
          {" / "}
          {fmt(plan.totalBudget, plan.currency)}
        </strong>
      </div>
    </div>
  );
}

// ─── Table cell styles ────────────────────────────────────────────────────────
const th: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left",
  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: 0.5, color: "#555",
};
const td: React.CSSProperties = {
  padding: "10px 12px", verticalAlign: "top",
};