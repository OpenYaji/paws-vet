'use client';

import { useState } from 'react';
import {
  Sparkles, RefreshCw, ShieldAlert, Lightbulb,
  ChevronDown, ChevronUp, Package, BarChart2, Clock,
  AlertTriangle, TrendingUp, CheckCircle2, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─── Types ─────────────────────────────────────────────────────────── */

interface CriticalAlert {
  type: 'inventory' | 'finance' | 'ops';
  message: string;
  severity: 'high' | 'medium';
}
interface AgentRecommendation {
  action: string;
  reasoning: string;
  expected_impact: string;
}
interface InsightData {
  summary: string;
  critical_alerts: CriticalAlert[];
  agentic_recommendations: AgentRecommendation[];
  deep_insight: string;
  _savedAt?: string;
}
interface DashboardStats {
  totalClients: number;
  totalPets: number;
  totalAppointments: number;
  totalVeterinarians: number;
  todayAppointments: number;
  upcomingAppointments: number;
  recentAppointments: any[];
  lowStockProducts: any[];
  revenueByCategory: Array<{ category: string; value: number; color: string }>;
  totalRevenue: number;
  salesPerformance?: { labels: string[]; series: Array<{ name: string; color: string; data: number[] }> };
  vetPerformance?: Array<{ category: string; value: number; color: string }>;
  weeklyRevenue?: number;
  inventoryStats?: { totalProducts: number; lowStockCount: number; outOfStock: number; totalInventoryValue: number; inventoryByCategory: Array<{ category: string; count: number }> };
  billingStats?: { todaySales: number; weeklyRevenue: number; monthlyRevenue: number; totalRevenue: number; totalInvoices: number; paidInvoices: number; unpaidInvoices: number; partialInvoices: number; outstandingBalance: number; dailyRevenue: Array<{ date: string; amount: number }> };
  appointmentStats?: { todayCount: number; thisWeekCount: number; totalCount: number; completionRate: number; cancelRate: number; byType: Record<string, number>; byStatus: Record<string, number> };
  petStats?: { totalPets: number; petsBySpecies: Array<{ species: string; count: number }> };
  employeeStats?: { totalEmployees: number; activeEmployees: number; suspendedEmployees: number; totalAdminStaff: number; totalVetStaff: number };
}

/* ─── Alert config ───────────────────────────────────────────────────── */

const ALERT_META = {
  inventory: { icon: Package,   label: 'Inventory'  },
  finance:   { icon: BarChart2, label: 'Finance'     },
  ops:       { icon: Clock,     label: 'Operations'  },
} satisfies Record<CriticalAlert['type'], { icon: React.ElementType; label: string }>;

/* ─── AlertCard ─────────────────────────────────────────────────────── */

function AlertCard({ alert }: { alert: CriticalAlert }) {
  const { icon: Icon, label } = ALERT_META[alert.type];
  const isHigh = alert.severity === 'high';

  const stripe = isHigh ? 'bg-red-600' : 'bg-orange-500';
  const iconWrap = isHigh ? 'bg-red-600 text-white' : 'bg-orange-500 text-white';
  const badge   = isHigh ? 'bg-red-600 text-white' : 'bg-orange-500 text-white';

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 overflow-hidden dark:bg-card dark:border-border">
      {/* accent stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.25 ${stripe}`} />

      {/* icon */}
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${iconWrap}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
            {label}
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none ${badge}`}>
            {isHigh ? 'HIGH' : 'MEDIUM'}
          </span>
        </div>
        <p className="text-xs leading-relaxed font-medium text-foreground/80">
          {alert.message}
        </p>
      </div>
    </div>
  );
}

/* ─── RecCard ───────────────────────────────────────────────────────── */

function RecCard({ rec, index }: { rec: AgentRecommendation; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-sm transition-shadow">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left group hover:bg-muted/50 transition-colors"
      >
        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center leading-none">
          {index + 1}
        </span>
        <p className="flex-1 text-[13px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
          {rec.action}
        </p>
        <div className="shrink-0 w-6 h-6 rounded-md bg-muted flex items-center justify-center">
          {open
            ? <ChevronUp   className="w-3.5 h-3.5 text-muted-foreground" />
            : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3.5 space-y-2.5 bg-muted/30">
          <div className="flex gap-3">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-10 pt-0.5">
              Why
            </span>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.reasoning}</p>
          </div>
          <div className="flex gap-3">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-primary w-10 pt-0.5">
              Goal
            </span>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">{rec.expected_impact}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Section label ─────────────────────────────────────────────────── */

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
        <Icon className="w-3 h-3 text-muted-foreground" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {children}
      </span>
    </div>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────── */

function Skeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-16 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2.5">
          <div className="h-3 w-14 rounded bg-muted mb-3" />
          <div className="h-[70px] rounded-xl bg-muted" />
          <div className="h-[58px] rounded-xl bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-muted mb-3" />
          <div className="h-11 rounded-xl bg-muted" />
          <div className="h-11 rounded-xl bg-muted" />
          <div className="h-11 rounded-xl bg-muted" />
        </div>
      </div>
      <div className="h-14 rounded-xl bg-muted" />
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */

const STORAGE_KEY         = 'vetsy_ai_insight';
const COLLAPSED_STORAGE_KEY = 'vetsy_ai_collapsed';

export function AgenticInsights({ stats }: { stats: DashboardStats }) {
  const [insight, setInsight] = useState<InsightData | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  };

  const generate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/admin/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stats),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Server error ${res.status}`);
      }
      const data: InsightData = await res.json();
      const withTs = { ...data, _savedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withTs));
      setInsight(withTs);
    } catch (e: any) {
      setError(e.message || 'Failed to generate insights.');
    } finally {
      setIsLoading(false);
    }
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setInsight(null);
    setError(null);
  };

  const highCount  = insight?.critical_alerts.filter(a => a.severity === 'high').length ?? 0;
  const savedLabel = insight?._savedAt
    ? new Date(insight._savedAt).toLocaleString('en-PH', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm mb-6 overflow-hidden">

      {/* ════ HEADER ════ */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-muted/40 cursor-pointer select-none ${!collapsed ? 'border-b border-border' : ''}`}
        onClick={toggleCollapsed}
      >
        <div className="flex items-center gap-3">
          {/* logo */}
          <div className="relative w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            {isLoading && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-card animate-pulse" />
            )}
          </div>

          {/* title */}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground leading-none">
                AI Clinic Insights
              </h3>
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-md leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                  {highCount} critical
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">
              {savedLabel ? `Last run ${savedLabel}` : 'Gemini 2.5 Flash · click to analyze'}
            </p>
          </div>
        </div>

        {/* actions */}
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {insight && !isLoading && (
            <button
              onClick={clear}
              className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-lg hover:bg-destructive/10"
            >
              Clear
            </button>
          )}
          <Button
            size="sm"
            onClick={generate}
            disabled={isLoading}
            className="gap-1.5 h-8 px-3 text-xs font-semibold text-primary-foreground"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Analyzing…' : insight ? 'Re-analyze' : 'Analyze Now'}
          </Button>
          {/* collapse toggle */}
          <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/15 transition-colors">
            {collapsed
              ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              : <ChevronUp   className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </div>
        </div>
      </div>

      {/* ════ BODY (collapsible) ════ */}
      {!collapsed && <>

      {/* ════ LOADING ════ */}
      {isLoading && <Skeleton />}

      {/* ════ ERROR ════ */}
      {error && !isLoading && (
        <div className="m-5 flex items-start gap-3 bg-red-100 border border-red-300 dark:bg-destructive/10 dark:border-destructive/30 rounded-xl p-4">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-700 dark:text-destructive" />
          <div>
            <p className="text-sm font-semibold mb-0.5 text-red-900 dark:text-destructive">Analysis failed</p>
            <p className="text-xs text-red-800 dark:text-destructive/70">{error}</p>
          </div>
        </div>
      )}

      {/* ════ EMPTY ════ */}
      {!insight && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1.5">No analysis yet</p>
          <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
            Click{' '}
            <button
              onClick={generate}
              className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
            >
              Analyze Now
            </button>{' '}
            to get AI-powered insights from your clinic's live data.
          </p>
        </div>
      )}

      {/* ════ RESULTS ════ */}
      {insight && !isLoading && (
        <div className="p-5 space-y-5">

          {/* Summary */}
          <div className="flex gap-3 items-start rounded-xl border border-border bg-muted/60 px-4 py-3.5">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">{insight.summary}</p>
          </div>

          {/* Alerts + Recs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Alerts */}
            <div>
              <SectionLabel icon={AlertTriangle}>Alerts</SectionLabel>
              <div className="space-y-2.5">
                {insight.critical_alerts.length > 0
                  ? insight.critical_alerts.map((a, i) => <AlertCard key={i} alert={a} />)
                  : (
                    <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-100 dark:border-green-900/40 dark:bg-green-950/20 px-4 py-3.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-green-700 dark:text-green-500" />
                      <p className="text-xs font-semibold text-green-900 dark:text-green-400">
                        All systems healthy — no alerts.
                      </p>
                    </div>
                  )
                }
              </div>
            </div>

            {/* Action Plan */}
            <div>
              <SectionLabel icon={TrendingUp}>Action Plan</SectionLabel>
              <div className="space-y-2">
                {insight.agentic_recommendations.map((r, i) => (
                  <RecCard key={i} rec={r} index={i} />
                ))}
              </div>
            </div>
          </div>

          {/* Deep Insight */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3.5">
            <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-200 dark:bg-amber-900/50 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 dark:text-amber-500 mb-1">
                Deep Insight
              </p>
              <p className="text-xs text-amber-950 dark:text-foreground/75 leading-relaxed font-medium">{insight.deep_insight}</p>
            </div>
          </div>

        </div>
      )}

      </>}
    </div>
  );
}