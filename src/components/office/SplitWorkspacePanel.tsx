// ─── Agent OS — SplitWorkspacePanel ──────────────────────────
// Bottom panel with tabs for different workspace views.
// Stage 5: Placeholder UI with real tabs.

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { OfficeApproval, OfficeEvent } from '@/hooks/useOfficeData';

interface SplitWorkspacePanelProps {
  approvals: OfficeApproval[];
  events: OfficeEvent[];
}

const PANEL_TABS = [
  { key: 'preview', label: 'Preview', icon: '👁️' },
  { key: 'files', label: 'Files', icon: '📁' },
  { key: 'terminal', label: 'Terminal', icon: '⬛' },
  { key: 'logs', label: 'Logs', icon: '📜' },
  { key: 'tests', label: 'Tests', icon: '🧪' },
  { key: 'documents', label: 'Documents', icon: '📄' },
  { key: 'rag', label: 'RAG', icon: '🔍' },
  { key: 'translations', label: 'Translations', icon: '🌐' },
  { key: 'ocr', label: 'OCR/ISR', icon: '📷' },
  { key: 'approvals', label: 'Approvals', icon: '✅' },
];

export function SplitWorkspacePanel({ approvals, events }: SplitWorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState('preview');

  return (
    <div className="h-full border-t bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="w-full justify-start h-8 rounded-none border-b bg-slate-50 px-1">
          {PANEL_TABS.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-[10px] h-6 px-2 data-[state=active]:bg-white"
            >
              <span className="mr-0.5">{tab.icon}</span>
              {tab.label}
              {tab.key === 'approvals' && approvals.length > 0 && (
                <span className="ml-1 text-[9px] bg-orange-100 text-orange-700 px-1 rounded-full">
                  {approvals.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-h-0 overflow-hidden">
          {PANEL_TABS.map((tab) => (
            <TabsContent key={tab.key} value={tab.key} className="h-full m-0 p-3">
              <TabContent tabKey={tab.key} approvals={approvals} events={events} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

function TabContent({ tabKey, approvals, events }: {
  tabKey: string;
  approvals: OfficeApproval[];
  events: OfficeEvent[];
}) {
  switch (tabKey) {
    case 'approvals':
      return (
        <ScrollArea className="h-full">
          {approvals.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No pending approvals</p>
          ) : (
            <div className="space-y-2">
              {approvals.map((a) => (
                <div key={a.id} className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                  <p className="font-medium">{a.summary}</p>
                  <p className="text-muted-foreground text-[10px]">
                    Risk: {a.risk} • Agent: {a.agent?.name} • {new Date(a.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      );

    case 'logs':
      return (
        <ScrollArea className="h-full">
          <div className="font-mono text-[10px] space-y-0.5">
            {events.slice(0, 50).map((e) => (
              <div key={e.id} className="flex gap-2">
                <span className="text-muted-foreground">
                  {new Date(e.createdAt).toLocaleTimeString()}
                </span>
                <span className="text-blue-600">{e.eventType}</span>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-muted-foreground">No logs yet</p>
            )}
          </div>
        </ScrollArea>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-2xl mb-1">
              {PANEL_TABS.find((t) => t.key === tabKey)?.icon ?? '🔧'}
            </p>
            <p className="text-xs text-muted-foreground">
              {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)} panel
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Coming in future stages
            </p>
          </div>
        </div>
      );
  }
}
