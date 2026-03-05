"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Radio,
  MessageSquare,
  Wrench,
  AlertCircle,
  ArrowRightLeft,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { AgentCommModel, CommMessageType } from "@/lib/openclaw-types";

const COMM_TYPE_META: Record<CommMessageType, { icon: typeof MessageSquare; color: string; label: string }> = {
  delegation: { icon: ArrowRightLeft, color: "text-blue-400", label: "Delegation" },
  status_update: { icon: Radio, color: "text-green-400", label: "Update" },
  escalation: { icon: AlertCircle, color: "text-red-400", label: "Escalation" },
  query: { icon: MessageSquare, color: "text-purple-400", label: "Query" },
};

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

type LiveFeedTickerProps = {
  visible: boolean;
  onToggle: () => void;
};

export function LiveFeedTicker({ visible, onToggle }: LiveFeedTickerProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [comms, setComms] = useState<AgentCommModel[]>([]);
  const [sessionEvents, setSessionEvents] = useState<Array<{ agentId: string; text: string; ts: number; type: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadComms = useCallback(async () => {
    try {
      const result = await adapter.getAgentComms();
      setComms(result);
    } catch { /* ignore */ }
  }, [adapter]);

  const loadSessionEvents = useCallback(async () => {
    try {
      const agents = await adapter.listAgents();
      const events: Array<{ agentId: string; text: string; ts: number; type: string }> = [];
      for (const agent of agents.slice(0, 3)) {
        const sessions = await adapter.listSessions(agent.agentId);
        const session = sessions[0];
        if (!session) continue;
        const timeline = await adapter.getSessionTimeline(agent.agentId, session.sessionKey, 5);
        for (const evt of timeline.events) {
          events.push({
            agentId: agent.agentId,
            text: evt.text.slice(0, 100),
            ts: evt.ts,
            type: evt.type,
          });
        }
      }
      events.sort((a, b) => b.ts - a.ts);
      setSessionEvents(events.slice(0, 20));
    } catch { /* ignore */ }
  }, [adapter]);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    void loadComms();
    void loadSessionEvents();
    timerRef.current = setInterval(() => {
      void loadComms();
      void loadSessionEvents();
    }, 10_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, loadComms, loadSessionEvents]);

  // Merge comms and session events into a unified timeline
  const feedItems = useMemo(() => {
    const items: Array<{
      id: string;
      agentId: string;
      text: string;
      ts: number;
      type: "comm" | "session";
      commType?: CommMessageType;
      toAgentId?: string;
    }> = [];

    for (const comm of comms) {
      items.push({
        id: comm.id,
        agentId: comm.fromAgentId,
        text: comm.summary,
        ts: comm.ts,
        type: "comm",
        commType: comm.messageType,
        toAgentId: comm.toAgentId,
      });
    }

    for (const evt of sessionEvents) {
      items.push({
        id: `session-${evt.agentId}-${evt.ts}`,
        agentId: evt.agentId,
        text: evt.text,
        ts: evt.ts,
        type: "session",
      });
    }

    items.sort((a, b) => b.ts - a.ts);
    return items.slice(0, 30);
  }, [comms, sessionEvents]);

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-full bg-card/80 backdrop-blur-sm border px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Eye className="h-3 w-3" />
        Show Feed
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-green-400 animate-pulse" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Live Feed</span>
          <span className="text-[9px] text-muted-foreground">({feedItems.length} events)</span>
        </div>
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <EyeOff className="h-3 w-3" />
          Hide
        </button>
      </div>
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-3 py-1.5 scrollbar-none">
        {feedItems.length === 0 ? (
          <span className="text-[10px] text-muted-foreground py-1">No activity yet...</span>
        ) : (
          feedItems.map((item) => {
            const meta = item.commType ? COMM_TYPE_META[item.commType] : null;
            const Icon = meta?.icon ?? (item.type === "session" ? Wrench : MessageSquare);
            const color = meta?.color ?? "text-muted-foreground";
            return (
              <div
                key={item.id}
                className="flex items-center gap-1.5 shrink-0 text-[10px] max-w-[300px]"
              >
                <Icon className={`h-3 w-3 shrink-0 ${color}`} />
                <span className="font-medium shrink-0">{item.agentId}</span>
                {item.toAgentId && (
                  <>
                    <ArrowRightLeft className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <span className="font-medium shrink-0">{item.toAgentId}</span>
                  </>
                )}
                <span className="text-muted-foreground truncate">{item.text}</span>
                <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(item.ts)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
