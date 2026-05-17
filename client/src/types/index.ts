/**
 * SMEwise AI Assistant — Shared TypeScript types (client)
 * Requirements: 1.2, 11.1, 19.1
 */

// ─── Business Profile ────────────────────────────────────────────────────────

export type BusinessStage =
  | "Idea Stage"
  | "Just Launched"
  | "1–2 Years Operating"
  | "Established 3+ Years";

export type BusinessType =
  | "Enterprise"
  | "Sdn Bhd"
  | "PLT"
  | "Sole Proprietorship"
  | "Partnership";

export interface BusinessProfile {
  companyName: string;          // required
  industry: string;             // required
  city: string;                 // required
  targetCustomer: string;       // required
  mainGoal: string;             // optional (may be empty string)
  currentFunds: number;         // required, range: 1,000 – 999,999,999
  businessStage: BusinessStage; // required
  businessType: BusinessType;   // required
  fundAllocation ?: string;     // optional
}

// ─── Pricing Strategy ────────────────────────────────────────────────────────

export interface PricingOptionalInputs {
  monthlyRevenueRange: string | null;  // dropdown value
  productServiceNames: string | null;  // textarea
  costPerProduct: string | null;       // textarea
}

// ─── Widget State ─────────────────────────────────────────────────────────────

export type WidgetStatus = "idle" | "loading" | "success" | "error";

export interface WidgetState {
  status: WidgetStatus;
  content: string | null;       // text output
  imageBase64: string | null;   // image output (base64-encoded PNG)
  errorMessage: string | null;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number; // Unix epoch ms
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

export interface MonthlyRevenue {
  month: string;
  value: number;
}

export interface ExpenseBreakdown {
  category: string;
  value: number;
  percentage: number;
}

export interface KPI {
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  change: string;
}

export interface Projections {
  nextQuarter: {
    revenue: number;
    growth: number;
  };
  yearEnd: {
    revenue: number;
    growth: number;
  };
}

export interface AnalyticsDashboardData {
  companyName: string;
  generatedAt: string;
  revenue: {
    monthly: MonthlyRevenue[];
    total: number;
    growth: number;
  };
  expenses: {
    breakdown: ExpenseBreakdown[];
    total: number;
  };
  kpis: KPI[];
  projections: Projections;
}
