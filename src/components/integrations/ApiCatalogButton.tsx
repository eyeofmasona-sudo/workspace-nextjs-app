'use client';

import { useEffect, useMemo, useState } from 'react';
import { Boxes, ExternalLink, PlugZap, Server, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface Integration {
  id: string;
  name: string;
  repository: string;
  category: string;
  mode: string;
  enabledByDefault: boolean;
  localEndpoint?: string;
  requires: string[];
  conflictsWith?: string[];
  notes: string;
}

export function ApiCatalogButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || items.length) return;
    setLoading(true);
    fetch('/api/integrations')
      .then((response) => {
        if (!response.ok) throw new Error('Integration catalog unavailable');
        return response.json();
      })
      .then((data) => setItems(data.integrations ?? []))
      .finally(() => setLoading(false));
  }, [open, items.length]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.name, item.category, item.mode, item.notes, ...item.requires]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [items, query]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="fixed right-24 top-1 z-50 h-7 border-cyan-400/30 bg-[#091522]/90 px-2 text-[10px] text-cyan-200 shadow-lg shadow-cyan-950/30 backdrop-blur-md hover:bg-cyan-500/15 hover:text-white"
        aria-label="Open API and integrations catalog"
      >
        <PlugZap className="mr-1 h-3.5 w-3.5" />
        API
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full border-cyan-500/20 bg-[#071019] p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-cyan-500/20 px-5 py-4">
            <SheetTitle className="flex items-center gap-2 text-cyan-100">
              <Boxes className="h-5 w-5" />
              JARVIS API & Integration Hub
            </SheetTitle>
            <p className="text-xs text-slate-400">
              Deduplicated adapters and managed services. JARVIS remains the primary orchestrator.
            </p>
          </SheetHeader>

          <div className="space-y-3 p-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search APIs, services, agents, requirements..."
              className="border-cyan-500/20 bg-black/20 text-slate-100"
            />

            <div className="flex flex-wrap gap-2 text-[10px]">
              <Badge className="bg-cyan-500/10 text-cyan-200"><ShieldCheck className="mr-1 h-3 w-3" />Approval gated</Badge>
              <Badge className="bg-violet-500/10 text-violet-200"><Server className="mr-1 h-3 w-3" />D:/JARVIS isolated</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-200">{items.length} canonical entries</Badge>
            </div>
          </div>

          <div className="h-[calc(100vh-170px)] space-y-2 overflow-y-auto px-4 pb-6">
            {loading && <p className="py-8 text-center text-sm text-slate-500">Loading catalog…</p>}
            {!loading && filtered.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">{item.name}</h3>
                      <Badge variant="outline" className="text-[9px] text-cyan-300">{item.category}</Badge>
                      <Badge variant="outline" className="text-[9px] text-violet-300">{item.mode}</Badge>
                      {item.enabledByDefault && <Badge className="bg-emerald-500/15 text-[9px] text-emerald-300">default</Badge>}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.notes}</p>
                  </div>
                  <a href={item.repository} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan-300" aria-label={`Open ${item.name} repository`}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.requires.map((requirement) => <Badge key={requirement} variant="secondary" className="text-[9px]">{requirement}</Badge>)}
                </div>
                {item.localEndpoint && <p className="mt-2 font-mono text-[10px] text-cyan-400/80">{item.localEndpoint}</p>}
                {!!item.conflictsWith?.length && <p className="mt-1 text-[10px] text-amber-300/80">Overlaps: {item.conflictsWith.join(', ')}</p>}
              </article>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
