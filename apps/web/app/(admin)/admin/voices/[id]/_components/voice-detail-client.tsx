'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  Star,
  StarOff,
  AlertTriangle,
  Bot,
  User,
  Clock,
  Save,
} from 'lucide-react';
import type { AdminRole, ModerationLogEntry, VoiceSubmission } from '@confluenceohio/db/types';
import { ModerationStatusBadge } from '../../_components/moderation-status-badge';
import { PositionBadge } from '../../_components/position-badge';

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
// Props
// ---------------------------------------------------------------------------

interface VoiceDetailClientProps {
  submission: VoiceSubmission;
  moderationLog: ModerationLogEntry[];
  adminRole: AdminRole;
  adminId: string;
  initialEditMode: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceDetailClient({
  submission,
  moderationLog,
  adminRole,
  initialEditMode,
}: VoiceDetailClientProps) {
  const router = useRouter();
  const isAdmin = adminRole === 'admin';

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reject form state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // Edit form state
  const [editing, setEditing] = useState(initialEditMode);
  const [editTitle, setEditTitle] = useState(submission.title);
  const [editBody, setEditBody] = useState(submission.body);
  const [editNote, setEditNote] = useState('');

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

  // ── API action handler ──

  const performAction = useCallback(
    async (actionName: string, body: Record<string, unknown>) => {
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

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setActionLoading(null);
      }
    },
    [submission.id, router],
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

  const handleEditSubmit = () => {
    if (!editNote.trim()) {
      setError('Edit note is required');
      return;
    }
    performAction('edit', {
      action: 'edit',
      title: editTitle,
      body: editBody,
      edit_note: editNote,
    }).then(() => setEditing(false));
  };

  const canBeFeatured =
    (submission.moderation_status === 'approved' ||
      submission.moderation_status === 'auto_approved') &&
    !submission.featured &&
    submission.author_name?.toLowerCase() !== 'anonymous';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/voices"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to voices
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {submission.title || 'Untitled submission'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ModerationStatusBadge status={submission.moderation_status} />
            <PositionBadge position={submission.position} />
            {submission.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                <Star className="h-3 w-3" />
                Featured
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {canBeApproved && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {actionLoading === 'approve' ? 'Approving\u2026' : 'Approve'}
            </button>
          )}

          {canBeApproved && (
            <button
              type="button"
              onClick={() => setShowRejectForm(!showRejectForm)}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          )}

          {isAdmin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}

          {canBeFeatured && (
            <button
              type="button"
              onClick={handleFeature}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
            >
              <Star className="h-4 w-4" />
              Feature
            </button>
          )}

          {submission.featured && (
            <button
              type="button"
              onClick={handleUnfeature}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <StarOff className="h-4 w-4" />
              Unfeature
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Reject form */}
      {showRejectForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-900">Reject Submission</h3>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
                Reason *
              </label>
              <select
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="">Select a reason</option>
                {REJECTION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="reject-note" className="block text-sm font-medium text-gray-700">
                Additional note (optional)
              </label>
              <textarea
                id="reject-note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                maxLength={500}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={!rejectReason || actionLoading !== null}
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content: side-by-side on desktop ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: submission text */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-3">
              <h2 className="text-sm font-medium text-gray-900">Submission</h2>
            </div>
            <div className="px-5 py-4">
              {/* Metadata */}
              <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>
                  <strong>Author:</strong> {submission.author_name}
                </span>
                {submission.author_neighborhood && (
                  <span>
                    <strong>Neighborhood:</strong> {submission.author_neighborhood}
                  </span>
                )}
                <span>
                  <strong>Email:</strong> {submission.author_email}
                </span>
                <span>
                  <strong>Submitted:</strong>{' '}
                  {new Date(submission.submitted_at).toLocaleString()}
                </span>
                <span>
                  <strong>Words:</strong>{' '}
                  {submission.body.trim().split(/\s+/).filter(Boolean).length}
                </span>
              </div>

              {/* Edit form or display */}
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      id="edit-title"
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={100}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-body" className="block text-sm font-medium text-gray-700">
                      Body *
                    </label>
                    <textarea
                      id="edit-body"
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={10}
                      minLength={50}
                      maxLength={2500}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {editBody.length}/2500 characters
                    </p>
                  </div>
                  <div>
                    <label htmlFor="edit-note" className="block text-sm font-medium text-gray-700">
                      Edit note (shown to author) *
                    </label>
                    <input
                      id="edit-note"
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      maxLength={500}
                      placeholder="Brief explanation of changes made..."
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleEditSubmit}
                      disabled={editBody.length < 50 || !editNote.trim() || actionLoading !== null}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {actionLoading === 'edit' ? 'Saving\u2026' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setEditTitle(submission.title);
                        setEditBody(submission.body);
                        setEditNote('');
                      }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {submission.body.split('\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: AI analysis */}
        <div className="space-y-4">
          {/* AI Analysis Panel */}
          {aiResult && (
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-medium text-gray-900">
                  <Bot className="h-4 w-4 text-purple-600" />
                  AI Analysis
                </h2>
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase">Decision</span>
                  <span className="text-sm font-medium capitalize">
                    {aiResult.decision?.replace(/_/g, ' ') ?? 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase">Confidence</span>
                  <span className="text-sm font-medium">
                    {aiResult.confidence != null
                      ? `${Math.round(aiResult.confidence * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
                {aiResult.reasoning && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">Reasoning</span>
                    <p className="mt-1 text-sm text-gray-700">{aiResult.reasoning}</p>
                  </div>
                )}
                {aiResult.flagged_issues && aiResult.flagged_issues.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Flagged Issues
                    </span>
                    <ul className="mt-1 space-y-1">
                      {aiResult.flagged_issues.map((issue) => (
                        <li
                          key={issue}
                          className="flex items-center gap-1.5 text-sm text-red-700"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {submission.moderation_ai_at && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Analyzed</span>
                    <span>{new Date(submission.moderation_ai_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submission info */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-medium text-gray-900">Details</h2>
            </div>
            <dl className="divide-y divide-gray-100 px-4">
              <div className="flex justify-between py-2">
                <dt className="text-xs text-gray-500">Slug</dt>
                <dd className="text-xs font-mono text-gray-700">{submission.slug}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-xs text-gray-500">Email Verified</dt>
                <dd className="text-xs text-gray-700">
                  {submission.email_verified ? 'Yes' : 'No'}
                </dd>
              </div>
              {submission.approved_at && (
                <div className="flex justify-between py-2">
                  <dt className="text-xs text-gray-500">Approved</dt>
                  <dd className="text-xs text-gray-700">
                    {new Date(submission.approved_at).toLocaleString()}
                  </dd>
                </div>
              )}
              {submission.rejected_at && (
                <div className="flex justify-between py-2">
                  <dt className="text-xs text-gray-500">Rejected</dt>
                  <dd className="text-xs text-gray-700">
                    {new Date(submission.rejected_at).toLocaleString()}
                  </dd>
                </div>
              )}
              {submission.rejection_reason && (
                <div className="flex justify-between py-2">
                  <dt className="text-xs text-gray-500">Rejection Reason</dt>
                  <dd className="text-xs text-gray-700">{submission.rejection_reason}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* ── Moderation History ── */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-medium text-gray-900">Moderation History</h2>
        </div>
        <div className="px-5 py-4">
          {moderationLog.length === 0 ? (
            <p className="text-sm text-gray-500">No moderation actions recorded.</p>
          ) : (
            <ol className="relative border-l border-gray-200">
              {moderationLog.map((entry) => (
                <li key={entry.id} className="mb-4 ml-4 last:mb-0">
                  <div className="absolute -left-2 mt-1.5 h-4 w-4 rounded-full border-2 border-white bg-gray-200">
                    {entry.actor_type === 'ai' ? (
                      <Bot className="h-3 w-3 text-purple-600" />
                    ) : (
                      <User className="h-3 w-3 text-blue-600" />
                    )}
                  </div>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatAction(entry.action)}
                      </p>
                      {entry.reasoning && (
                        <p className="mt-0.5 text-sm text-gray-600">{entry.reasoning}</p>
                      )}
                      {entry.ai_confidence != null && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          Confidence: {Math.round(entry.ai_confidence * 100)}%
                        </p>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAction(action: string): string {
  const MAP: Record<string, string> = {
    ai_approve: 'AI Auto-Approved',
    ai_reject: 'AI Rejected',
    ai_flag_for_review: 'AI Flagged for Review',
    human_approve: 'Manually Approved',
    human_reject: 'Manually Rejected',
    edit: 'Content Edited',
    feature: 'Marked as Featured',
    unfeature: 'Removed from Featured',
    human_override: 'Override Applied',
  };
  return MAP[action] || action.replace(/_/g, ' ');
}
