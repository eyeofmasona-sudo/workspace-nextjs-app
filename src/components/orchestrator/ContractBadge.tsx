'use client';

// ─── ContractBadge ────────────────────────────────────────────
// Displays TaskContract metadata inline in task/chat UI.
// Shows: riskLevel, routingConfidence, approvalRequired, quality status.

import type { QualityStatus } from '@/lib/orchestrator/TaskContract';

// ── Risk badge ────────────────────────────────────────────────

const RISK_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  low:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400', label: 'Low Risk' },
  medium:   { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Medium Risk' },
  high:     { bg: 'bg-orange-50',  text: 'text-orange-700',  dot: 'bg-orange-500',  label: 'High Risk' },
  critical: { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Critical Risk' },
};

export function RiskBadge({ riskLevel }: { riskLevel: string }) {
  const cfg = RISK_CONFIG[riskLevel] ?? RISK_CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Routing confidence badge ──────────────────────────────────

export function RoutingConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const isLow = confidence < 0.5;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${
      isLow ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-600'
    }`}>
      🎯 {pct}%{isLow ? ' ⚠️ low confidence' : ''}
    </span>
  );
}

// ── Quality status badge ──────────────────────────────────────

const QUALITY_CONFIG: Record<QualityStatus, { bg: string; text: string; icon: string; label: string }> = {
  passed:      { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '✅', label: 'Approved' },
  needs_review:{ bg: 'bg-amber-50',   text: 'text-amber-700',   icon: '🔍', label: 'Needs Review' },
  blocked:     { bg: 'bg-red-50',     text: 'text-red-700',     icon: '🚫', label: 'Blocked' },
  escalated:   { bg: 'bg-purple-50',  text: 'text-purple-700',  icon: '👤', label: 'Awaiting Approval' },
};

export function QualityStatusBadge({ status }: { status: QualityStatus }) {
  const cfg = QUALITY_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Approval required indicator ───────────────────────────────

export function ApprovalRequiredBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700">
      👤 Approval Required
    </span>
  );
}

// ── Full contract inline display ──────────────────────────────

interface ContractBadgeProps {
  riskLevel: string;
  routingConfidence: number;
  approvalRequired: boolean;
  qualityStatus?: QualityStatus;
  qualityScore?: number;
  issues?: string[];
}

export function ContractBadge({
  riskLevel,
  routingConfidence,
  approvalRequired,
  qualityStatus,
  qualityScore,
  issues,
}: ContractBadgeProps) {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      <RiskBadge riskLevel={riskLevel} />
      <RoutingConfidenceBadge confidence={routingConfidence} />
      {approvalRequired && <ApprovalRequiredBadge />}
      {qualityStatus && <QualityStatusBadge status={qualityStatus} />}
      {qualityScore !== undefined && (
        <span className="text-[9px] text-slate-500">
          Score: {Math.round(qualityScore * 100)}%
        </span>
      )}
      {issues && issues.length > 0 && (
        <details className="text-[9px]">
          <summary className="cursor-pointer text-red-600">{issues.length} issue{issues.length > 1 ? 's' : ''}</summary>
          <ul className="mt-1 pl-2 space-y-0.5 text-red-700 list-disc">
            {issues.slice(0, 5).map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Escalation card ───────────────────────────────────────────

interface EscalationCardProps {
  contractGoal: string;
  riskLevel: string;
  qualityScore: number;
  issues: string[];
  approvalRequestId: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export function EscalationCard({
  contractGoal,
  riskLevel,
  qualityScore,
  issues,
  approvalRequestId,
  onApprove,
  onReject,
}: EscalationCardProps) {
  return (
    <div className="border border-purple-200 bg-purple-50 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-purple-700 font-semibold">👤 Human Review Required</span>
        <RiskBadge riskLevel={riskLevel} />
      </div>

      <p className="text-slate-700 font-medium">{contractGoal}</p>

      <div className="text-slate-600">
        Quality score: <span className={qualityScore < 0.5 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
          {Math.round(qualityScore * 100)}%
        </span>
      </div>

      {issues.length > 0 && (
        <ul className="text-red-700 list-disc pl-3 space-y-0.5">
          {issues.map((issue, i) => <li key={i}>{issue}</li>)}
        </ul>
      )}

      <div className="text-[10px] text-slate-400 font-mono">ID: {approvalRequestId}</div>

      {(onApprove || onReject) && (
        <div className="flex gap-2 pt-1">
          {onApprove && (
            <button
              onClick={onApprove}
              className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] hover:bg-emerald-700"
            >
              ✓ Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-3 py-1 bg-red-600 text-white rounded text-[10px] hover:bg-red-700"
            >
              ✗ Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}
