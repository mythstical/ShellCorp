"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
    Bell,
    Settings,
    Menu,
    Hammer,
    Home,
    Layers,
    MessageSquare,
    BookOpen,
    UserPlus,
    ShoppingBag,
    Users,
    UserSearch,
    Wrench,
    ClipboardList,
    BarChart3,
    Shield,
    Brain,
    BookMarked,
    Activity,
} from "lucide-react";
import { SpeedDial, type SpeedDialItem } from "@/components/ui/speed-dial";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/app-store";
import { api } from "@/convex/_generated/api";
import { UserTasksPanel } from "@/components/hud/user-tasks-panel";
import { AgentManager } from "./agent-manager";
import { FurnitureShop } from "./furniture-shop";
import { TeamManager } from "./team-manager";
import { TeamDirectory } from "./team-directory";
import { ToolManager } from "./tool-manager";
import { SkillManager } from "./skill-manager";
import { PlanKanban } from "./plan-kanban";
import { KpiDashboard } from "./kpi-dashboard";
import { CircuitBreakerPanel } from "./circuit-breaker-panel";
import { MemoryViewer } from "./memory-viewer";
import { SkillLibrary } from "./skill-library";
import { CompanyHealthPanel } from "./company-health-panel";
import { stateBase } from "@/lib/gateway-config";
import { OpenClawAdapter } from "@/lib/openclaw-adapter";

interface SpeedDialProps {
    className?: string;
}

export function OfficeMenu({
    className,
}: SpeedDialProps) {
    const navigate = useNavigate();
    // Use selectors to prevent unnecessary re-renders
    const isBuilderMode = useAppStore(state => state.isBuilderMode);
    const setBuilderMode = useAppStore(state => state.setBuilderMode);
    const isAnimatingCamera = useAppStore(state => state.isAnimatingCamera);
    const setAnimatingCamera = useAppStore(state => state.setAnimatingCamera);
    const setIsGlobalTeamPanelOpen = useAppStore(state => state.setIsGlobalTeamPanelOpen);
    const setIsAgentSessionPanelOpen = useAppStore(state => state.setIsAgentSessionPanelOpen);
    const setIsSkillsPanelOpen = useAppStore(state => state.setIsSkillsPanelOpen);
    const setActiveTeamId = useAppStore(state => state.setActiveTeamId);
    const setSelectedTeamId = useAppStore(state => state.setSelectedTeamId);
    const setKanbanFocusAgentId = useAppStore(state => state.setKanbanFocusAgentId);
    const setIsSettingsModalOpen = useAppStore(state => state.setIsSettingsModalOpen);
    const placementMode = useAppStore(state => state.placementMode);

    const [isUserTasksOpen, setIsUserTasksOpen] = useState(false);
    const [isAgentManagerOpen, setIsAgentManagerOpen] = useState(false);
    const [isFurnitureShopOpen, setIsFurnitureShopOpen] = useState(false);
    const [isTeamManagerOpen, setIsTeamManagerOpen] = useState(false);
    const [isTeamDirectoryOpen, setIsTeamDirectoryOpen] = useState(false);
    const [isToolManagerOpen, setIsToolManagerOpen] = useState(false);
    const [isSkillManagerOpen, setIsSkillManagerOpen] = useState(false);
    const [isPlanKanbanOpen, setIsPlanKanbanOpen] = useState(false);
    const [isKpiDashboardOpen, setIsKpiDashboardOpen] = useState(false);
    const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState(false);
    const [isMemoryViewerOpen, setIsMemoryViewerOpen] = useState(false);
    const [isSkillLibraryOpen, setIsSkillLibraryOpen] = useState(false);
    const [isCompanyHealthOpen, setIsCompanyHealthOpen] = useState(false);
    const [planCount, setPlanCount] = useState(0);

    useEffect(() => {
        const adapter = new OpenClawAdapter("", stateBase);
        let cancelled = false;
        const poll = async () => {
            try {
                const plans = await adapter.getAgentPlans();
                if (!cancelled) {
                    setPlanCount(plans.filter((p) => p.status === "proposed").length);
                }
            } catch { /* ignore */ }
        };
        void poll();
        const timer = setInterval(() => void poll(), 10_000);
        return () => { cancelled = true; clearInterval(timer); };
    }, []);
    const apiRoot = api as unknown as {
        office_system?: {
            employees?: { createEmployee?: unknown };
            teams?: { updateTeam?: unknown };
        };
        agents_system?: {
            tools?: { toolConfigs?: { listToolConfigs?: unknown } };
        };
    };
    const canOpenAgentManager = Boolean(apiRoot.office_system?.employees?.createEmployee);
    const canOpenTeamManager = Boolean(apiRoot.office_system?.teams?.updateTeam);
    const canOpenToolManager = Boolean(apiRoot.agents_system?.tools?.toolConfigs?.listToolConfigs);

    useEffect(() => {
        if (!placementMode.active) return;
        setIsUserTasksOpen(false);
        setIsAgentManagerOpen(false);
        setIsFurnitureShopOpen(false);
        setIsTeamManagerOpen(false);
        setIsTeamDirectoryOpen(false);
        setIsToolManagerOpen(false);
        setIsSkillManagerOpen(false);
        setIsPlanKanbanOpen(false);
        setIsKpiDashboardOpen(false);
        setIsCircuitBreakerOpen(false);
        setIsMemoryViewerOpen(false);
        setIsSkillLibraryOpen(false);
        setIsCompanyHealthOpen(false);
    }, [placementMode.active]);

    // Handle builder mode toggle - let the scene handle animation
    const handleBuilderModeToggle = useCallback(() => {
        if (isAnimatingCamera) return; // Prevent clicks during animation

        setAnimatingCamera(true); // Start animation state
        setBuilderMode(!isBuilderMode); // This will trigger the animation in OfficeScene
    }, [isAnimatingCamera, isBuilderMode, setAnimatingCamera, setBuilderMode]);

    const speedDialItems: SpeedDialItem[] = useMemo(() => [
        {
            id: "back-landing",
            icon: Home,
            label: "Back to Landing",
            onClick: () => navigate("/"),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "builder-mode",
            icon: Hammer,
            label: "Builder Mode",
            onClick: handleBuilderModeToggle,
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
            disabled: isAnimatingCamera, // Disable during animation
        },
        {
            id: "user-tasks",
            icon: Bell,
            label: "User Tasks",
            onClick: () => setIsUserTasksOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "plan-kanban",
            icon: ClipboardList,
            label: "Governance Board",
            onClick: () => setIsPlanKanbanOpen(true),
            badge: planCount > 0 ? planCount : undefined,
            color: planCount > 0
                ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30"
                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "kpi-dashboard",
            icon: BarChart3,
            label: "Agent KPIs",
            onClick: () => setIsKpiDashboardOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "circuit-breakers",
            icon: Shield,
            label: "Circuit Breakers",
            onClick: () => setIsCircuitBreakerOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "memory-viewer",
            icon: Brain,
            label: "Memory Viewer",
            onClick: () => setIsMemoryViewerOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "skill-library",
            icon: BookMarked,
            label: "Skill Library",
            onClick: () => setIsSkillLibraryOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "company-health",
            icon: Activity,
            label: "Company Health",
            onClick: () => setIsCompanyHealthOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "team-panel",
            icon: Layers,
            label: "Team Panel",
            onClick: () => {
                setActiveTeamId(null);
                setSelectedTeamId(null);
                setKanbanFocusAgentId(null);
                setIsGlobalTeamPanelOpen(true);
            },
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "agent-session-panel",
            icon: MessageSquare,
            label: "Agent Session Panel",
            onClick: () => setIsAgentSessionPanelOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "recruit-agent",
            icon: UserPlus,
            label: "Recruit Agent",
            onClick: () => {
                if (!canOpenAgentManager) return;
                setIsAgentManagerOpen(true);
            },
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
            disabled: !canOpenAgentManager,
        },
        {
            id: "furniture-shop",
            icon: ShoppingBag,
            label: "Shop",
            onClick: () => setIsFurnitureShopOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "manage-teams",
            icon: Users,
            label: "Manage Teams",
            onClick: () => {
                if (!canOpenTeamManager) return;
                setIsTeamManagerOpen(true);
            },
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
            disabled: !canOpenTeamManager,
        },
        {
            id: "team-directory",
            icon: UserSearch,
            label: "Team Directory",
            onClick: () => setIsTeamDirectoryOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "manage-tools",
            icon: Wrench,
            label: "Manage Tools",
            onClick: () => {
                if (!canOpenToolManager) return;
                setIsToolManagerOpen(true);
            },
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
            disabled: !canOpenToolManager,
        },
        {
            id: "skills-panel",
            icon: BookOpen,
            label: "Skills Panel",
            onClick: () => setIsSkillsPanelOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "manage-skills",
            icon: BookOpen,
            label: "Manage Skills",
            onClick: () => setIsSkillManagerOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
        {
            id: "settings",
            icon: Settings,
            label: "Settings",
            onClick: () => setIsSettingsModalOpen(true),
            color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        },
    ], [
        navigate,
        isAnimatingCamera,
        handleBuilderModeToggle,
        setActiveTeamId,
        setIsAgentSessionPanelOpen,
        setIsGlobalTeamPanelOpen,
        setIsSettingsModalOpen,
        setIsSkillsPanelOpen,
        setKanbanFocusAgentId,
        setSelectedTeamId,
        canOpenAgentManager,
        canOpenTeamManager,
        canOpenToolManager,
        planCount,
    ]);

    return (
        <>
            <SpeedDial
                items={speedDialItems}
                position="top-left"
                direction="vertical"
                triggerIcon={Menu}
                triggerColor="bg-accent hover:bg-accent/90 text-accent-foreground"
                className={className}
            />
            {isUserTasksOpen ? <UserTasksPanel isOpen={isUserTasksOpen} onOpenChange={setIsUserTasksOpen} /> : null}
            {isAgentManagerOpen ? <AgentManager isOpen={isAgentManagerOpen} onOpenChange={setIsAgentManagerOpen} /> : null}
            {isFurnitureShopOpen ? <FurnitureShop isOpen={isFurnitureShopOpen} onOpenChange={setIsFurnitureShopOpen} /> : null}
            {isTeamManagerOpen ? <TeamManager isOpen={isTeamManagerOpen} onOpenChange={setIsTeamManagerOpen} /> : null}
            {isTeamDirectoryOpen ? <TeamDirectory isOpen={isTeamDirectoryOpen} onOpenChange={setIsTeamDirectoryOpen} /> : null}
            {isToolManagerOpen ? <ToolManager isOpen={isToolManagerOpen} onOpenChange={setIsToolManagerOpen} /> : null}
            {isSkillManagerOpen ? <SkillManager isOpen={isSkillManagerOpen} onOpenChange={setIsSkillManagerOpen} /> : null}
            {isPlanKanbanOpen ? <PlanKanban isOpen={isPlanKanbanOpen} onOpenChange={setIsPlanKanbanOpen} /> : null}
            {isKpiDashboardOpen ? <KpiDashboard isOpen={isKpiDashboardOpen} onOpenChange={setIsKpiDashboardOpen} /> : null}
            {isCircuitBreakerOpen ? <CircuitBreakerPanel isOpen={isCircuitBreakerOpen} onOpenChange={setIsCircuitBreakerOpen} /> : null}
            {isMemoryViewerOpen ? <MemoryViewer isOpen={isMemoryViewerOpen} onOpenChange={setIsMemoryViewerOpen} /> : null}
            {isSkillLibraryOpen ? <SkillLibrary isOpen={isSkillLibraryOpen} onOpenChange={setIsSkillLibraryOpen} /> : null}
            {isCompanyHealthOpen ? <CompanyHealthPanel isOpen={isCompanyHealthOpen} onOpenChange={setIsCompanyHealthOpen} /> : null}
        </>
    );
}

