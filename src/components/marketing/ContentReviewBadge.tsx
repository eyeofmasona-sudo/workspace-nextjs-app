'use client';

// ─── ContentReviewBadge ───────────────────────────────────────
// Displays brand guardian scorecard inline.
// Used before publishing content in any marketing workflow.

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { ReviewResult, ReviewRiskLevel } from '@/lib/marketing/ContentReviewService';

// ── Risk level config ─────────────────────────────────────────

const RISK_CONFIG: Record<ReviewRiskLevel, {
  bg: string; border: string; text: string; dot: string; icon: string; label: string;
}> = {
  low:      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400', icon: '✅', label: 'Approved' },
  medium:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   dot: 'bg-amber-400',   icon: '🔍', label: 'Needs Review' },
  high:     { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  dot: 'bg-orange-500',  icon: '⚠️', label: 'Blocked' },
  critical: { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500',     icon: '🚫', label: 'Critical Block' },
};

// ── Score bar ─────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-600 w-8 text-right">{score}</span>
    </div>
  );
}

// ── Dimension row ─────────────────────────────────────────────

function DimensionRow({ name, score, issues }: { name: string; score: number; issues: string[] }) {
  const color = score >= 70 ? 'text-emerald-600' : score >= 45 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-slate-500 w-24 shrink-0">{name}</span>
      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 70 ? 'bg-emerald-400' : score >= 45 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`font-mono w-6 text-right ${color}`}>{score}</span>
      {issues.length > 0 && <span className="text-red-500 text-[9px]">⚠</span>}
    </div>
  );
}

// ── Inline review badge (compact) ────────────────────────────

interface ContentReviewBadgeProps {
  result: ReviewResult;
  onPublish?: () => void;
  onRequestReview?: () => void;
  publishLabel?: string;
}

export function ContentReviewBadge({
  result,
  onPublish,
  onRequestReview,
  publishLabel = 'Publish',
}: ContentReviewBadgeProps) {
  const [showDetails, setShowDetails] = useState(false);
  const cfg = RISK_CONFIG[result.riskLevel];

  return (
    <div className={`rounded-lg border p-2.5 text-xs ${cfg.bg} ${cfg.border} space-y-2`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{cfg.icon}</span>
          <span className={`font-semibold ${cfg.text}`}>{cfg.label}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
            {result.score}/100
          </span>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`text-[10px] ${cfg.text} hover:underline`}
        >
          {showDetails ? '▲ Less' : '▼ Details'}
        </button>
      </div>

      {/* Score bar */}
      <ScoreBar score={result.score} />

      {/* Issues summary */}
      {result.issues.length > 0 && (
        <div className={`text-[10px] ${cfg.text}`}>
          {result.issues.length} issue{result.issues.length > 1 ? 's' : ''} found
          {!showDetails && ` — click Details to view`}
        </div>
      )}

      {/* Expanded details */}
      {showDetails && (
        <div className="space-y-2 pt-1 border-t border-current/10">
          {/* Dimension breakdown */}
          <div className="space-y-1">
            {result.dimensions.map(d => (
              <DimensionRow key={d.name} name={d.name} score={d.score} issues={d.issues} />
            ))}
          </div>

          {/* Issues list */}
          {result.issues.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-600">Issues:</p>
              {result.issues.map((issue, i) => (
                <p key={i} className="text-[10px] text-red-700">• {issue}</p>
              ))}
            </div>
          )}

          {/* Suggested fixes */}
          {result.suggestedFixes.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold text-slate-600">Suggestions:</p>
              {result.suggestedFixes.slice(0, 4).map((fix, i) => (
                <p key={i} className="text-[10px] text-slate-600">→ {fix}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {!result.blockedFromPublishing && onPublish && (
          <Button
            size="sm"
            className="h-6 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onPublish}
          >
            {publishLabel}
          </Button>
        )}
        {result.requiresHumanReview && onRequestReview && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-3 text-[10px]"
            onClick={onRequestReview}
          >
            👤 Request Brand Guardian Review
          </Button>
        )}
        {result.blockedFromPublishing && (
          <span className="text-[10px] text-red-600 font-medium flex items-center">
            🚫 Publishing blocked — {result.riskLevel === 'critical' ? 'critical risk' : 'requires approval'}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Content Review Widget (interactive) ──────────────────────

interface ContentReviewWidgetProps {
  initialText?: string;
  platform?: string;
  workspaceId?: string;
  agentId?: string;
  onPublish?: (text: string, result: ReviewResult) => void;
}

export function ContentReviewWidget({
  initialText = '',
  platform = 'general',
  workspaceId,
  agentId,
  onPublish,
}: ContentReviewWidgetProps) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);

  const check = useCallback(async () => {
    if (!text.trim()) return;
    setChecking(true);
    try {
      const res = await fetch('/api/marketing/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, platform, workspaceId, agentId }),
      });
      if (res.ok) {
        const data = await res.json() as { result: ReviewResult };
        setResult(data.result);
      }
    } finally {
      setChecking(false);
    }
  }, [text, platform, workspaceId, agentId]);

  const handlePublish = useCallback(() => {
    if (result && onPublish) onPublish(text, result);
  }, [text, result, onPublish]);

  const handleReviewRequest = useCallback(() => {
    setReviewRequested(true);
  }, []);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
            Content · {platform}
          </label>
          <span className="text-[10px] text-slate-400">{text.length} chars</span>
        </div>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setResult(null); }}
          className="w-full h-24 text-xs border border-slate-200 rounded p-2 resize-none focus:outline-none focus:border-blue-300"
          placeholder="Enter your content here…"
        />
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-[10px] w-full"
        onClick={check}
        disabled={checking || !text.trim()}
      >
        {checking ? '⏳ Checking…' : '🛡️ Check with Brand Guardian'}
      </Button>

      {reviewRequested && !result?.blockedFromPublishing && (
        <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
          👤 Brand Guardian review requested — awaiting approval
        </div>
      )}

      {result && (
        <ContentReviewBadge
          result={result}
          onPublish={handlePublish}
          onRequestReview={handleReviewRequest}
        />
      )}
    </div>
  );
}
