'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Pencil,
  Star,
  StarOff,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { AdminRole, ModerationStatus, VoiceSubmission } from '@confluenceohio/db/types';
import { ModerationStatusBadge } from './moderation-status-badge';
import { PositionBadge } from './position-badge';

// ---------------------------------------------------------------------------
// Rejection reasons
// ---------------------------------------------------------------------------

const REJECTION_REASONS = [
  { value: 'personal_attack', label: 'Personal attack' },
  { value: 'spam', label: 'Spam' },
  { value: 'off_topic', label: 'Off-topic' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'ai_generated', label: 'AI-generated' },
  { value: 'other', label: 'Other' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'High';
  if (confidence >= 0.7) return 'Medium';
  return 'Low';
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-700';
  if (confidence >= 0.7) return 'text-yellow-700';
  return 'text-red-700';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModerationCardProps {
  submission: VoiceSubmission;
  adminRole: AdminRole;
  /** Ref to the next card's expand button for focus management */
  nextCardRef?: React.RefObject<HTMLButtonElement | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModerationCard({
  submission,
  adminRole,
  nextCardRef,
}: ModerationCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const expandRef = useRef<HTMLButtonElement>(null);

  const isAdmin = adminRole === 'admin';
  const aiResult = submission.moderation_ai_result as {
    decision?: string;
    confidence?: number;
    reasoning?: string;
    flagged_issues?: string[];
  } | null;

  const canBeApproved =
    submission.moderation_status === 'needs_review' ||
    submission.moderation_status === 'pending' ||
    submission.moderation_status === 'auto_approved';
  const canBeRejected = canBeApproved;
  const canBeFeatured =
    (submission.moderation_status === 'approved' ||
      submission.moderation_status === 'auto_approved') &&
    !submission.featured &&
    submission.author_name?.toLowerCase() !== 'anonymous';
  const canBeUnfeatured = submission.featured;

  // ── API action handler ──

  const performAction = useCallback(
    async (
      actionName: string,
      body: Record<string, unknown>,
    ) => {
      setActionLoading(actionName);
      setError(null);

      try {
        const res = await fetch(`/api/admin/voices/${submission.id}/moderate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error || 'Action failed');
        }

        // Move focus to next card if available
        if (nextCardRef?.current) {
          nextCardRef.current.focus();
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setActionLoading(null);
        setShowRejectForm(false);
      }
    },
    [submission.id, router, nextCardRef],
  );

  const handleApprove = () => performAction('approve', { action: 'approve' });
  const handleFeature = () => performAction('feature', { action: 'feature' });
  const handleUnfeature = () => performAction('unfeature', { action: 'unfeature' });
  const handleRejectSubmit = () => {
    if (!rejectReason) return;
    performAction('reject', {
      action: 'reject',
      reason: rejectReason,
      note: rejectNote || undefined,
    });
  };

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${
        submission.featured ? 'border-yellow-300 ring-1 ring-yellow-200' : 'border-gray-200'
      }`}
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Expand/collapse toggle */}
        <button
          ref={expandRef}
          type="button"
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
          className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse submission' : 'Expand submission'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Content summary */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ModerationStatusBadge status={submission.moderation_status} />
            <PositionBadge position={submission.position} />
            {submission.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
            {aiResult?.confidence != null && (
              <span
                className={`text-xs font-medium ${confidenceColor(aiResult.confidence)}`}
                title={`AI confidence: ${Math.round(aiResult.confidence * 100)}%`}
              >
                AI: {confidenceLabel(aiResult.confidence)} ({Math.round(aiResult.confidence * 100)}%)
              </span>
            )}
          </div>

          <div className="mt-1">
            <button
              type="button"
              onClick={() => router.push(`/admin/voices/${submission.id}`)}
              className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline text-left"
            >
              {submission.title || submission.body.slice(0, 80) + (submission.body.length > 80 ? '\u2026' : '')}
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span>{submission.author_name}</span>
            {submission.author_neighborhood && (
              <span>{submission.author_neighborhood}</span>
            )}
            <span>{wordCount(submission.body)} words</span>
            <span title={new Date(submission.submitted_at).toLocaleString()}>
              <Clock className="mr-0.5 inline h-3 w-3" />
              {relativeTime(submission.submitted_at)}
            </span>
          </div>

          {/* AI flagged issues */}
          {aiResult?.flagged_issues && aiResult.flagged_issues.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {aiResult.flagged_issues.map((issue) => (
                <span
                  key={issue}
                  className="inline-flex items-center gap-0.5 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {issue}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons — always visible */}
        <div className="flex shrink-0 items-center gap-1">
          {canBeApproved && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
              title="Approve"
            >
              <Check className="h-3.5 w-3.5" />
              {actionLoading === 'approve' ? 'Approving\u2026' : 'Approve'}
            </button>
          )}

          {canBeRejected && (
            <button
              type="button"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              title="Reject"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => router.push(`/admin/voices/${submission.id}?edit=true`)}
              className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

          {canBeFeatured && (
            <button
              type="button"
              onClick={handleFeature}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-2.5 py-1.5 text-xs font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
              title="Feature"
            >
              <Star className="h-3.5 w-3.5" />
            </button>
          )}

          {canBeUnfeatured && (
            <button
              type="button"
              onClick={handleUnfeature}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Unfeature"
            >
              <StarOff className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Reject form ── */}
      {showRejectForm && (
        <div className="border-t border-gray-100 bg-red-50/50 px-4 py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor={`reject-reason-${submission.id}`}
                className="block text-xs font-medium text-gray-700"
              >
                Reason
              </label>
              <select
                id={`reject-reason-${submission.id}`}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1 h-8 rounded-md border border-gray-300 px-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select reason</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor={`reject-note-${submission.id}`}
                className="block text-xs font-medium text-gray-700"
              >
                Note (optional)
              </label>
              <input
                id={`reject-note-${submission.id}`}
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Additional context..."
                maxLength={500}
                className="mt-1 h-8 w-full rounded-md border border-gray-300 px-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <button
              type="button"
              onClick={handleRejectSubmit}
              disabled={!rejectReason || actionLoading !== null}
              className="h-8 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading === 'reject' ? 'Rejecting\u2026' : 'Confirm Reject'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason('');
                setRejectNote('');
              }}
              className="h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Expanded body ── */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="prose prose-sm max-w-none text-gray-700">
            {submission.body.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          {aiResult?.reasoning && (
            <div className="mt-3 rounded-md bg-gray-50 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                AI Reasoning
              </p>
              <p className="mt-1 text-sm text-gray-700">{aiResult.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Error message ── */}
      {error && (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
