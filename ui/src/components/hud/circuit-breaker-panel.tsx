"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Loader2,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { CircuitBreakerModel, CircuitBreakerState } from "@/lib/openclaw-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type CircuitBreakerPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const STATE_META: Record<CircuitBreakerState, { label: string; color: string; icon: typeof Shield; bgColor: string }> = {
  closed: { label: "Healthy", color: "text-green-400", icon: ShieldCheck, bgColor: "bg-green-500/10 border-green-500/30" },
  half_open: { label: "Testing", color: "text-yellow-400", icon: ShieldAlert, bgColor: "bg-yellow-500/10 border-yellow-500/30" },
  open: { label: "Isolated", color: "text-red-400", icon: ShieldOff, bgColor: "bg-red-500/10 border-red-500/30" },
};

function BreakerCard({
  breaker,
  onToggle,
  toggling,
}: {
  breaker: CircuitBreakerModel;
  onToggle: (agentId: string, state: string) => void;
  toggling: string | null;
}) {
  const meta = STATE_META[breaker.state];
  const StateIcon = meta.icon;
  const isToggling = toggling === breaker.agentId;
  const failureRatio = breaker.threshold > 0 ? breaker.failureCount / breaker.threshold : 0;

  return (
    <div className={`rounded-lg border p-3 space-y-2.5 transition-all ${meta.bgColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StateIcon className={`h-5 w-5 ${meta.color}`} />
          <div>
            <p className="text-sm font-medium">{breaker.agentId}</p>
            <p className={`text-[10px] font-semibold ${meta.color}`}>{meta.label}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.color}`}>
          {breaker.failureCount}/{breaker.threshold} failures
        </Badge>
      </div>

      {/* Failure threshold bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${failureRatio >= 1 ? "bg-red-500" : failureRatio >= 0.6 ? "bg-yellow-500" : "bg-green-500"}`}
            style={{ width: `${Math.min(failureRatio * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>Successes: {breaker.successCount}</span>
        {breaker.lastFailureAt && (
          <span>Last failure: {new Date(breaker.lastFailureAt).toLocaleTimeString()}</span>
        )}
      </div>

      {/* Dependencies */}
      {breaker.dependencies.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Depends on:</span>
          {breaker.dependencies.map((dep) => (
            <Badge key={dep} variant="outline" className="text-[9px] px-1 py-0">{dep}</Badge>
          ))}
        </div>
      )}

      {/* Manual controls */}
      <div className="flex items-center gap-1.5 pt-0.5">
        {breaker.state === "open" && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 flex-1 text-[10px] border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
            onClick={() => onToggle(breaker.agentId, "half_open")}
            disabled={isToggling}
          >
            {isToggling ? <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" /> : <ArrowRight className="mr-1 h-2.5 w-2.5" />}
            Test Recovery
          </Button>
        )}
        {breaker.state === "half_open" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-[10px] border-green-500/30 text-green-400 hover:bg-green-500/10"
              onClick={() => onToggle(breaker.agentId, "closed")}
              disabled={isToggling}
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 flex-1 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => onToggle(breaker.agentId, "open")}
              disabled={isToggling}
            >
              Isolate
            </Button>
          </>
        )}
        {breaker.state === "closed" && breaker.failureCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 flex-1 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
            onClick={() => onToggle(breaker.agentId, "open")}
            disabled={isToggling}
          >
            <AlertTriangle className="mr-1 h-2.5 w-2.5" />
            Force Isolate
          </Button>
        )}
      </div>
    </div>
  );
}

export function CircuitBreakerPanel({ isOpen, onOpenChange }: CircuitBreakerPanelProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [breakers, setBreakers] = useState<CircuitBreakerModel[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setBreakers(await adapter.getCircuitBreakers());
    } catch { /* ignore */ }
  }, [adapter]);

  const handleToggle = useCallback(
    async (agentId: string, state: string) => {
      setToggling(agentId);
      try {
        const result = await adapter.toggleCircuitBreaker(agentId, state);
        if (result.ok) await load();
      } finally {
        setToggling(null);
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

  const unhealthyCount = breakers.filter((b) => b.state !== "closed").length;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] max-w-[95vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {unhealthyCount > 0 ? (
              <ShieldAlert className="h-5 w-5 text-red-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-green-400" />
            )}
            Circuit Breakers
            {unhealthyCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {unhealthyCount} unhealthy
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Monitor agent health and manage cascading failure protection. Isolate failing agents to prevent chain reactions.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {breakers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Shield className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No circuit breakers</p>
              <p className="text-xs text-muted-foreground mt-1">Agent health monitoring will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {breakers.map((breaker) => (
                <BreakerCard key={breaker.agentId} breaker={breaker} onToggle={handleToggle} toggling={toggling} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
