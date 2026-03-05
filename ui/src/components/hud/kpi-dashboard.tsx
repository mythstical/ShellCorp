"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { AgentKpiModel } from "@/lib/openclaw-types";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type KpiDashboardProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: number[] }) {
  if (trend.length < 2) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  if (last > prev) return <TrendingUp className="h-3 w-3 text-green-400" />;
  if (last < prev) return <TrendingDown className="h-3 w-3 text-red-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function AgentKpiCard({ kpi }: { kpi: AgentKpiModel }) {
  const qualityColor = kpi.qualityScore >= 0.9 ? "text-green-400" : kpi.qualityScore >= 0.7 ? "text-yellow-400" : "text-red-400";
  const errorColor = kpi.errorRate <= 0.05 ? "text-green-400" : kpi.errorRate <= 0.15 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-medium">{kpi.displayName}</span>
          <span className="text-[10px] text-muted-foreground">({kpi.agentId})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon trend={kpi.trend} />
          <Sparkline data={kpi.trend} color="hsl(var(--primary))" />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-400" />
            <span className="text-sm font-semibold">{kpi.tasksCompleted}</span>
          </div>
          <p className="text-[9px] text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3 text-red-400" />
            <span className="text-sm font-semibold">{kpi.tasksFailed}</span>
          </div>
          <p className="text-[9px] text-muted-foreground">Failed</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-sm font-semibold">{kpi.avgResponseMs < 1000 ? `${kpi.avgResponseMs}ms` : `${(kpi.avgResponseMs / 1000).toFixed(1)}s`}</span>
          </div>
          <p className="text-[9px] text-muted-foreground">Avg Response</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Zap className="h-3 w-3 text-purple-400" />
            <span className="text-sm font-semibold">{(kpi.tokenUsage / 1000000).toFixed(1)}M</span>
          </div>
          <p className="text-[9px] text-muted-foreground">Tokens</p>
        </div>
      </div>

      {/* Quality & Error bars */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Quality Score</span>
          <span className={qualityColor}>{(kpi.qualityScore * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${kpi.qualityScore >= 0.9 ? "bg-green-500" : kpi.qualityScore >= 0.7 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${kpi.qualityScore * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Error Rate</span>
          <span className={errorColor}>{(kpi.errorRate * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${kpi.errorRate <= 0.05 ? "bg-green-500" : kpi.errorRate <= 0.15 ? "bg-yellow-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(kpi.errorRate * 100 * 5, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
        <span>{kpi.sessionCount} sessions</span>
        <span>{kpi.tasksInProgress} in progress</span>
        <Badge variant="outline" className="text-[9px] px-1 py-0">{kpi.period}</Badge>
      </div>
    </div>
  );
}

export function KpiDashboard({ isOpen, onOpenChange }: KpiDashboardProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [kpis, setKpis] = useState<AgentKpiModel[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setKpis(await adapter.getAgentKpis());
    } catch { /* ignore */ }
  }, [adapter]);

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    void load();
    timerRef.current = setInterval(() => void load(), 15_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, load]);

  // Aggregate stats
  const totals = useMemo(() => {
    if (kpis.length === 0) return null;
    return {
      completed: kpis.reduce((sum, k) => sum + k.tasksCompleted, 0),
      failed: kpis.reduce((sum, k) => sum + k.tasksFailed, 0),
      avgQuality: kpis.reduce((sum, k) => sum + k.qualityScore, 0) / kpis.length,
      avgError: kpis.reduce((sum, k) => sum + k.errorRate, 0) / kpis.length,
    };
  }, [kpis]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] max-w-[95vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Agent Performance KPIs
          </SheetTitle>
          <SheetDescription>
            Track task completion rates, response times, error rates, and quality scores per agent.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {kpis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No KPI data</p>
              <p className="text-xs text-muted-foreground mt-1">Agent performance metrics will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aggregate summary */}
              {totals && (
                <div className="grid grid-cols-4 gap-2 rounded-lg border bg-muted/30 p-3">
                  <div className="text-center">
                    <p className="text-lg font-bold">{totals.completed}</p>
                    <p className="text-[9px] text-muted-foreground">Total Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{totals.failed}</p>
                    <p className="text-[9px] text-muted-foreground">Total Failed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{(totals.avgQuality * 100).toFixed(0)}%</p>
                    <p className="text-[9px] text-muted-foreground">Avg Quality</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{(totals.avgError * 100).toFixed(1)}%</p>
                    <p className="text-[9px] text-muted-foreground">Avg Error Rate</p>
                  </div>
                </div>
              )}

              {/* Per-agent cards */}
              {kpis.map((kpi) => (
                <AgentKpiCard key={kpi.agentId} kpi={kpi} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
