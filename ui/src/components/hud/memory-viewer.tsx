"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Brain,
  BookOpen,
  Lightbulb,
  Wrench,
  Search,
  Filter,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { AgentMemoryEntry, MemoryCategory } from "@/lib/openclaw-types";
import { MEMORY_TYPE_TO_CATEGORY } from "@/lib/openclaw-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type MemoryViewerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  agentId?: string;
};

const CATEGORY_META: Record<MemoryCategory, { label: string; icon: typeof Brain; color: string }> = {
  episodic: { label: "Episodic", icon: Lightbulb, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  semantic: { label: "Semantic", icon: BookOpen, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  procedural: { label: "Procedural", icon: Wrench, color: "text-green-400 bg-green-500/10 border-green-500/30" },
};

function categorizeEntry(entry: AgentMemoryEntry): MemoryCategory {
  if (entry.type && MEMORY_TYPE_TO_CATEGORY[entry.type]) {
    return MEMORY_TYPE_TO_CATEGORY[entry.type];
  }
  return "episodic";
}

function MemoryEntryCard({ entry, category }: { entry: AgentMemoryEntry; category: MemoryCategory }) {
  const meta = CATEGORY_META[category];
  const CategoryIcon = meta.icon;
  const dateStr = entry.ts ? new Date(entry.ts).toLocaleDateString() : "unknown";

  return (
    <div className="rounded-lg border bg-card p-2.5 space-y-1.5 transition-all hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <CategoryIcon className={`h-3.5 w-3.5 shrink-0 ${meta.color.split(" ")[0]}`} />
          <span className="text-xs font-medium truncate">{entry.text}</span>
        </div>
        <Badge variant="outline" className={`text-[9px] px-1 py-0 shrink-0 ${meta.color}`}>
          {meta.label}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{entry.agentId}</span>
        <span>{dateStr}</span>
        {entry.type && (
          <Badge variant="outline" className="text-[9px] px-1 py-0">{entry.type}</Badge>
        )}
      </div>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px]">{tag}</span>
          ))}
        </div>
      )}
      <div className="text-[10px] text-muted-foreground">
        {entry.source.sourcePath}:{entry.source.lineNumber}
      </div>
    </div>
  );
}

export function MemoryViewer({ isOpen, onOpenChange, agentId }: MemoryViewerProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [entries, setEntries] = useState<AgentMemoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | "all">("all");
  const [agentIds, setAgentIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const ids = agentId ? [agentId] : [];
      if (ids.length === 0) {
        const agents = await adapter.listAgents();
        ids.push(...agents.map((a) => a.agentId));
      }
      setAgentIds(ids);
      const allEntries: AgentMemoryEntry[] = [];
      for (const id of ids) {
        const agentEntries = await adapter.listAgentMemoryEntries(id);
        allEntries.push(...agentEntries);
      }
      allEntries.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
      setEntries(allEntries);
    } catch { /* ignore */ }
  }, [adapter, agentId]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);

  const categorized = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      category: categorizeEntry(entry),
    }));
  }, [entries]);

  const filtered = useMemo(() => {
    return categorized.filter(({ entry, category }) => {
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      if (search) {
        const lower = search.toLowerCase();
        return entry.text.toLowerCase().includes(lower) || entry.tags.some((t) => t.toLowerCase().includes(lower));
      }
      return true;
    });
  }, [categorized, categoryFilter, search]);

  const counts = useMemo(() => {
    const c = { episodic: 0, semantic: 0, procedural: 0 };
    for (const { category } of categorized) {
      c[category] += 1;
    }
    return c;
  }, [categorized]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[520px] max-w-[95vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Agent Memory
            <Badge variant="secondary" className="ml-1 text-xs">{entries.length}</Badge>
          </SheetTitle>
          <SheetDescription>
            Browse agent memories categorized as episodic (experiences), semantic (knowledge), and procedural (skills).
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Category filters */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <button
              className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${categoryFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              onClick={() => setCategoryFilter("all")}
            >
              All ({entries.length})
            </button>
            {(["episodic", "semantic", "procedural"] as MemoryCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${categoryFilter === cat ? `${meta.color}` : "bg-muted hover:bg-muted/80"}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {meta.label} ({counts[cat]})
                </button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 px-4 pb-4 mt-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {entries.length === 0 ? "No memories found" : "No matches"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {entries.length === 0 ? "Agent memory entries will appear here." : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(({ entry, category }) => (
                <MemoryEntryCard key={entry.id} entry={entry} category={category} />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
