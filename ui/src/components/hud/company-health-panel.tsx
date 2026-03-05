"use client";

import { useMemo } from "react";
import {
  Activity,
  Heart,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  ListTodo,
  Gauge,
  ShieldCheck,
  Zap,
} from "lucide-react";

import type { CompanyHealthModel } from "@/lib/openclaw-types";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useOfficeDataContext } from "@/providers/office-data-provider";

type CompanyHealthPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Heart }> = {
  healthy: { label: "Healthy", color: "text-green-400", icon: CheckCircle2 },
  degraded: { label: "Degraded", color: "text-yellow-400", icon: AlertTriangle },
  critical: { label: "Critical", color: "text-red-400", icon: XCircle },
};

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Heart; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center space-y-1">
      <Icon className={`h-5 w-5 mx-auto ${color ?? "text-muted-foreground"}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function CompanyHealthPanel({ isOpen, onOpenChange }: CompanyHealthPanelProps) {
  const { employees, teams, companyModel, workload, warnings } = useOfficeDataContext();

  const health = useMemo((): CompanyHealthModel => {
    const agents = companyModel?.agents ?? [];
    const tasks = companyModel?.tasks ?? [];
    const activeAgents = agents.filter((a) => a.lifecycleState === "active").length;
    const idleAgents = agents.filter((a) => a.lifecycleState === "idle").length;
    const errorAgents = employees.filter((e) => e.status === "warning").length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const openTasks = tasks.filter((t) => t.status !== "done").length;
    const pressures = workload.map((w) => w.queuePressure);
    const avgPressure = pressures.includes("high") ? "high" : pressures.includes("medium") ? "medium" : "low";
    const overallStatus = warnings.length > 3 || errorAgents > 1 ? "critical" : warnings.length > 0 ? "degraded" : "healthy";
    const heartbeatRate = agents.length > 0 ? (agents.length - errorAgents) / agents.length : 1;

    return {
      overallStatus,
      activeAgents,
      idleAgents,
      errorAgents,
      totalTasks: tasks.length,
      completedTasks,
      openTasks,
      avgQueuePressure: avgPressure,
      warningCount: warnings.length,
      heartbeatSuccessRate: heartbeatRate,
      tokenUsageTotal: 0,
    };
  }, [companyModel, employees, workload, warnings]);

  const statusMeta = STATUS_META[health.overallStatus] ?? STATUS_META.healthy;
  const StatusIcon = statusMeta.icon;
  const pressureColor = health.avgQueuePressure === "high" ? "text-red-400" : health.avgQueuePressure === "medium" ? "text-yellow-400" : "text-green-400";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] max-w-[95vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Company Health
            <Badge variant="outline" className={`ml-1 text-xs ${statusMeta.color}`}>
              {statusMeta.label}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            System-wide health overview aggregating agent status, task metrics, and reconciliation warnings.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-4">
            {/* Overall status banner */}
            <div className={`rounded-lg border p-4 text-center ${
              health.overallStatus === "healthy" ? "bg-green-500/5 border-green-500/30" :
              health.overallStatus === "degraded" ? "bg-yellow-500/5 border-yellow-500/30" :
              "bg-red-500/5 border-red-500/30"
            }`}>
              <StatusIcon className={`h-10 w-10 mx-auto mb-2 ${statusMeta.color}`} />
              <p className={`text-xl font-bold ${statusMeta.color}`}>{statusMeta.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {health.overallStatus === "healthy" ? "All systems operational" :
                 health.overallStatus === "degraded" ? "Some issues detected — review warnings" :
                 "Critical issues require immediate attention"}
              </p>
            </div>

            {/* Agent vitals */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Agent Vitals
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={CheckCircle2} label="Active" value={health.activeAgents} color="text-green-400" />
                <StatCard icon={Gauge} label="Idle" value={health.idleAgents} color="text-blue-400" />
                <StatCard icon={XCircle} label="Errors" value={health.errorAgents} color="text-red-400" />
              </div>
            </div>

            {/* Task metrics */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <ListTodo className="h-3.5 w-3.5" />
                Task Metrics
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon={ListTodo} label="Total Tasks" value={health.totalTasks} />
                <StatCard icon={CheckCircle2} label="Completed" value={health.completedTasks} color="text-green-400" />
                <StatCard icon={Zap} label="Open" value={health.openTasks} color="text-yellow-400" />
              </div>
              {health.totalTasks > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Completion Rate</span>
                    <span>{((health.completedTasks / health.totalTasks) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${(health.completedTasks / health.totalTasks) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* System health indicators */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                System Health
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                  <span className="text-xs">Queue Pressure</span>
                  <Badge variant="outline" className={`text-[10px] ${pressureColor}`}>{health.avgQueuePressure}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                  <span className="text-xs">Heartbeat Success Rate</span>
                  <span className={`text-xs font-medium ${health.heartbeatSuccessRate >= 0.9 ? "text-green-400" : "text-yellow-400"}`}>
                    {(health.heartbeatSuccessRate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                  <span className="text-xs">Active Warnings</span>
                  <Badge variant={health.warningCount > 0 ? "destructive" : "outline"} className="text-[10px]">
                    {health.warningCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                  <span className="text-xs">Teams</span>
                  <span className="text-xs font-medium">{teams.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border bg-card p-2.5">
                  <span className="text-xs">Total Employees</span>
                  <span className="text-xs font-medium">{employees.length}</span>
                </div>
              </div>
            </div>

            {/* Warnings list */}
            {warnings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                  Active Warnings
                </h3>
                <div className="space-y-1.5">
                  {warnings.map((warning, index) => (
                    <div key={`${warning.code}-${index}`} className="rounded-md border border-yellow-500/20 bg-yellow-500/5 px-2.5 py-1.5 text-[11px]">
                      <span className="font-mono text-yellow-400">{warning.code}</span>
                      <span className="text-muted-foreground ml-2">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
