"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import {
  ClipboardList,
  Check,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  GripVertical,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { AgentPlanModel, PlanStatus } from "@/lib/openclaw-types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type PlanKanbanProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

/* ------------------------------------------------------------------ */
/*  Column metadata                                                    */
/* ------------------------------------------------------------------ */

const COLUMNS: { status: PlanStatus; label: string; color: string; headerBg: string; dropHint: string }[] = [
  { status: "proposed", label: "Proposed", color: "border-blue-500/40", headerBg: "bg-blue-500/10 text-blue-400", dropHint: "Drop here to request review" },
  { status: "approved", label: "Approved", color: "border-green-500/40", headerBg: "bg-green-500/10 text-green-400", dropHint: "Drop here to approve" },
  { status: "in_progress", label: "In Progress", color: "border-yellow-500/40", headerBg: "bg-yellow-500/10 text-yellow-400", dropHint: "Drop here to start" },
  { status: "completed", label: "Completed", color: "border-emerald-500/40", headerBg: "bg-emerald-500/10 text-emerald-400", dropHint: "Drop here to complete" },
  { status: "rejected", label: "Rejected", color: "border-red-500/40", headerBg: "bg-red-500/10 text-red-400", dropHint: "Drop here to reject" },
];

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICON: Record<string, typeof Check> = {
  done: CheckCircle2,
  running: Loader2,
  skipped: XCircle,
};

/* ------------------------------------------------------------------ */
/*  Plan card                                                          */
/* ------------------------------------------------------------------ */

function PlanCard({
  plan,
  resolving,
}: {
  plan: AgentPlanModel;
  resolving: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isResolving = resolving === plan.id;
  const doneSteps = plan.steps.filter((s) => s.status === "done").length;
  const totalSteps = plan.steps.length;
  const progressPct = totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0;

  return (
    <div
      draggable={!isResolving}
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData("text/plain", plan.id);
        e.dataTransfer.effectAllowed = "move";
        // Add a dragging class via data attribute for styling
        (e.target as HTMLElement).dataset.dragging = "true";
      }}
      onDragEnd={(e: DragEvent) => {
        delete (e.target as HTMLElement).dataset.dragging;
      }}
      className="group rounded-lg border bg-card p-3 space-y-2 cursor-grab active:cursor-grabbing transition-all hover:border-foreground/20 data-[dragging=true]:opacity-50 data-[dragging=true]:rotate-1 data-[dragging=true]:scale-95"
    >
      {/* Drag handle + title */}
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">{plan.title}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${RISK_COLORS[plan.riskLevel]}`}>
              {plan.riskLevel}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{plan.agentId}</p>
        </div>
      </div>

      {/* Goal */}
      <p className="text-[11px] leading-relaxed text-muted-foreground pl-6">{plan.goal}</p>

      {/* Impact warning */}
      {plan.estimatedImpact && (
        <div className="flex items-center gap-1 text-[10px] text-orange-400 pl-6">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{plan.estimatedImpact}</span>
        </div>
      )}

      {/* Progress bar + expandable steps */}
      <div className="space-y-1.5 pl-6">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{doneSteps}/{totalSteps} steps</span>
          <button
            className="flex items-center gap-0.5 hover:text-foreground transition-colors"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary/80 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Expanded step list */}
      {expanded && (
        <div className="space-y-1 pl-6 pt-1 border-t border-border/50">
          {plan.steps.map((step) => {
            const StepIcon = STATUS_ICON[step.status] ?? Clock;
            return (
              <div key={step.id} className="flex items-center gap-1.5 text-[10px]">
                <StepIcon className={`h-2.5 w-2.5 shrink-0 ${step.status === "done" ? "text-green-400" : step.status === "running" ? "text-yellow-400 animate-spin" : step.status === "skipped" ? "text-red-400" : "text-muted-foreground"}`} />
                <span className={step.status === "done" ? "text-muted-foreground line-through" : step.status === "skipped" ? "text-muted-foreground line-through" : ""}>
                  {step.description}
                </span>
                {step.toolName && (
                  <code className="ml-auto rounded bg-muted px-1 py-0.5 font-mono text-[9px] shrink-0">
                    {step.toolName}
                  </code>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isResolving && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-6">
          <Loader2 className="h-3 w-3 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Kanban column                                                      */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  column,
  plans,
  resolving,
  dragOverColumn,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  column: typeof COLUMNS[number];
  plans: AgentPlanModel[];
  resolving: string | null;
  dragOverColumn: PlanStatus | null;
  onDragOver: (e: DragEvent, status: PlanStatus) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, status: PlanStatus) => void;
}) {
  const isDragOver = dragOverColumn === column.status;

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-colors min-w-[220px] ${
        isDragOver
          ? `${column.color} bg-accent/30 ring-2 ring-primary/20`
          : "border-border/50 bg-muted/20"
      }`}
      onDragOver={(e) => onDragOver(e, column.status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.status)}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-lg px-3 py-2 ${column.headerBg}`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider">{column.label}</h3>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-current/30">
          {plans.length}
        </Badge>
      </div>

      {/* Drop hint when dragging */}
      {isDragOver && (
        <div className="px-3 py-1.5 text-[10px] text-center text-muted-foreground border-b border-dashed border-current/20">
          {column.dropHint}
        </div>
      )}

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[60px]">
          {plans.length === 0 && !isDragOver && (
            <div className="flex items-center justify-center py-8 text-[10px] text-muted-foreground/50">
              No plans
            </div>
          )}
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} resolving={resolving} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main kanban board                                                  */
/* ------------------------------------------------------------------ */

export function PlanKanban({ isOpen, onOpenChange }: PlanKanbanProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [plans, setPlans] = useState<AgentPlanModel[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<PlanStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await adapter.getAgentPlans();
      setPlans(result);
    } catch { /* ignore */ }
  }, [adapter]);

  const handleResolve = useCallback(
    async (id: string, newStatus: string) => {
      setResolving(id);
      try {
        const result = await adapter.resolvePlan(id, newStatus);
        if (result.ok) await load();
      } finally {
        setResolving(null);
      }
    },
    [adapter, load],
  );

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    void load();
    timerRef.current = setInterval(() => void load(), 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, load]);

  const columns = useMemo(() => {
    const map: Record<PlanStatus, AgentPlanModel[]> = {
      proposed: [],
      approved: [],
      in_progress: [],
      completed: [],
      rejected: [],
    };
    for (const plan of plans) {
      (map[plan.status] ?? map.proposed).push(plan);
    }
    return map;
  }, [plans]);

  const proposedCount = columns.proposed.length;

  /* ----- Drag handlers ----- */

  const handleDragOver = useCallback((e: DragEvent, status: PlanStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetStatus: PlanStatus) => {
      e.preventDefault();
      setDragOverColumn(null);
      const planId = e.dataTransfer.getData("text/plain");
      if (!planId) return;
      const plan = plans.find((p) => p.id === planId);
      if (!plan || plan.status === targetStatus) return;
      void handleResolve(planId, targetStatus);
    },
    [plans, handleResolve],
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[90vw] max-w-none h-[90vh] overflow-hidden p-0 z-[1200]">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Plan Governance Board
            {proposedCount > 0 && (
              <Badge className="ml-1 bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {proposedCount} awaiting review
              </Badge>
            )}
            <span className="text-xs font-normal text-muted-foreground ml-2">
              Drag plans between columns to approve, start, complete, or reject
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 pb-6">
          <div className="grid grid-cols-5 gap-4 h-full min-w-[1100px]">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                column={col}
                plans={columns[col.status]}
                resolving={resolving}
                dragOverColumn={dragOverColumn}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
