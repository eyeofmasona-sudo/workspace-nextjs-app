// ─── Agent OS — ApprovalQueue ────────────────────────────────
// Shows pending approval requests with approve/reject buttons.

'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAgentVisual } from '@/lib/office/agentDefaults';
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import type { OfficeApproval } from '@/hooks/useOfficeData';

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 border-green-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

interface ApprovalQueueProps {
  approvals: OfficeApproval[];
  onAction?: (approvalId: string, action: 'approve' | 'reject') => void;
}

export function ApprovalQueue({ approvals, onAction }: ApprovalQueueProps) {
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const handleApprove = async (approvalId: string) => {
    setProcessing((prev) => new Set(prev).add(approvalId));
    try {
      const res = await fetch(`/api/approvals/${approvalId}/approve`, { method: 'POST' });
      if (res.ok) {
        onAction?.(approvalId, 'approve');
      }
    } catch {
      // Will be refreshed on next poll
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  const handleReject = async (approvalId: string) => {
    setProcessing((prev) => new Set(prev).add(approvalId));
    try {
      const res = await fetch(`/api/approvals/${approvalId}/reject`, { method: 'POST' });
      if (res.ok) {
        onAction?.(approvalId, 'reject');
      }
    } catch {
      // Will be refreshed on next poll
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(approvalId);
        return next;
      });
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold">Approval Queue</h3>
        {approvals.length > 0 && (
          <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
            {approvals.length}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 pr-1">
          {approvals.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-xs">✅ No pending approvals</p>
            </div>
          )}
          {approvals.map((approval) => {
            const agentVisual = getAgentVisual(approval.agent?.role ?? '');
            return (
              <Card key={approval.id} className="py-0">
                <CardContent className="p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{agentVisual.emoji}</span>
                        <span className="text-xs font-medium truncate">
                          {approval.agent?.name ?? 'Unknown'}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-3.5 px-1 ${RISK_COLORS[approval.risk] ?? ''}`}
                        >
                          {approval.risk}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {approval.summary}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                          {approval.actionType}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(approval.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(approval.id)}
                      disabled={processing.has(approval.id)}
                    >
                      {processing.has(approval.id) ? <Loader2 className="w-3 h-3 mr-0.5 animate-spin" /> : <Check className="w-3 h-3 mr-0.5" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(approval.id)}
                      disabled={processing.has(approval.id)}
                    >
                      {processing.has(approval.id) ? <Loader2 className="w-3 h-3 mr-0.5 animate-spin" /> : <X className="w-3 h-3 mr-0.5" />}
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
