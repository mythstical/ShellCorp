"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookMarked,
  Star,
  TrendingUp,
  User,
  Tag,
} from "lucide-react";

import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";
import type { ExtractedSkillModel } from "@/lib/openclaw-types";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

type SkillLibraryProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

function SkillCard({ skill }: { skill: ExtractedSkillModel }) {
  const successColor = skill.successRate >= 0.9 ? "text-green-400" : skill.successRate >= 0.7 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 transition-all hover:border-foreground/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{skill.name}</p>
          <p className="text-[11px] text-muted-foreground">{skill.description}</p>
        </div>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{skill.category}</Badge>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{skill.sourceAgentId}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          <span>{skill.usageCount} uses</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className={`h-3 w-3 ${successColor}`} />
          <span className={successColor}>{(skill.successRate * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Success rate bar */}
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${skill.successRate >= 0.9 ? "bg-green-500" : skill.successRate >= 0.7 ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${skill.successRate * 100}%` }}
        />
      </div>

      {skill.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <Tag className="h-2.5 w-2.5 text-muted-foreground" />
          {skill.tags.map((tag) => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[9px]">{tag}</span>
          ))}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        Extracted {new Date(skill.extractedAt).toLocaleDateString()}
      </div>
    </div>
  );
}

export function SkillLibrary({ isOpen, onOpenChange }: SkillLibraryProps) {
  const adapter = useMemo(() => new OpenClawAdapter("", stateBase), []);
  const [skills, setSkills] = useState<ExtractedSkillModel[]>([]);

  const load = useCallback(async () => {
    try {
      setSkills(await adapter.getExtractedSkills());
    } catch { /* ignore */ }
  }, [adapter]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ExtractedSkillModel[]>();
    for (const skill of skills) {
      const list = map.get(skill.category) ?? [];
      list.push(skill);
      map.set(skill.category, list);
    }
    return map;
  }, [skills]);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] max-w-[95vw] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Skill Library
            <Badge variant="secondary" className="ml-1 text-xs">{skills.length} skills</Badge>
          </SheetTitle>
          <SheetDescription>
            Reusable skills extracted from successful agent task completions. Shared across the organization.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 pb-4">
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookMarked className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No extracted skills</p>
              <p className="text-xs text-muted-foreground mt-1">Skills will appear here as agents learn from successful tasks.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{skills.length}</p>
                  <p className="text-[9px] text-muted-foreground">Total Skills</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{skills.reduce((s, k) => s + k.usageCount, 0)}</p>
                  <p className="text-[9px] text-muted-foreground">Total Uses</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {skills.length > 0 ? (skills.reduce((s, k) => s + k.successRate, 0) / skills.length * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">Avg Success</p>
                </div>
              </div>

              {/* By category */}
              {[...byCategory.entries()].map(([category, categorySkills]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{categorySkills.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {categorySkills.map((skill) => (
                      <SkillCard key={skill.id} skill={skill} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
