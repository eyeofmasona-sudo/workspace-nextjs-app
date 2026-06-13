'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

// Tab components
import { SkillsTab } from './SkillsTab';
import { ToolsTab } from './ToolsTab';
import { CapabilitiesTab } from './CapabilitiesTab';
import { PacksTab } from './PacksTab';
import { MarketplaceTab } from './MarketplaceTab';
import { AnalyticsTab } from './AnalyticsTab';

// ─── Types ──────────────────────────────────────────────────

interface EcosystemPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Tab Configuration ─────────────────────────────────────

const TABS = [
  { value: 'skills', label: 'Skills', emoji: '🎯' },
  { value: 'tools', label: 'Tools', emoji: '🔧' },
  { value: 'capabilities', label: 'Capabilities', emoji: '📊' },
  { value: 'packs', label: 'Packs', emoji: '📦' },
  { value: 'marketplace', label: 'Marketplace', emoji: '🏪' },
  { value: 'analytics', label: 'Analytics', emoji: '📈' },
] as const;

// ─── Component ──────────────────────────────────────────────

export function EcosystemPanel({ open, onOpenChange }: EcosystemPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-slate-700/50 bg-[#0f0f1a] p-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
      >
        {/* Header */}
        <SheetHeader className="border-b border-slate-700/50 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-base text-slate-200">
            <span className="text-lg">🧩</span>
            Agent Ecosystem
          </SheetTitle>
          <p className="text-[11px] text-slate-500">
            Manage skills, tools, capabilities, packs, and marketplace
          </p>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="skills" className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-slate-700/50 px-2">
            <TabsList className="h-9 w-full justify-start gap-0 overflow-x-auto bg-transparent p-0">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex h-9 flex-shrink-0 items-center gap-1 rounded-none border-b-2 border-transparent px-3 text-[11px] text-slate-400 data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-200 data-[state=active]:shadow-none"
                >
                  <span className="text-xs">{tab.emoji}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="skills" className="mt-0">
              <SkillsTab />
            </TabsContent>
            <TabsContent value="tools" className="mt-0">
              <ToolsTab />
            </TabsContent>
            <TabsContent value="capabilities" className="mt-0">
              <CapabilitiesTab />
            </TabsContent>
            <TabsContent value="packs" className="mt-0">
              <PacksTab />
            </TabsContent>
            <TabsContent value="marketplace" className="mt-0">
              <MarketplaceTab />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0">
              <AnalyticsTab />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer separator */}
        <Separator className="bg-slate-700/50" />
        <div className="px-4 py-2">
          <p className="text-center text-[9px] text-slate-600">
            Agent OS Ecosystem — Skills • Tools • Capabilities • Packs • Marketplace
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
