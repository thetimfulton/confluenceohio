// ---------------------------------------------------------------------------
// Moderation Constants — packages/core/voices/moderation.ts
// ---------------------------------------------------------------------------
// AI moderation system prompt, formatting, and decision mapping for voice
// submissions. See Artifact 10 §2.2 for the full spec.
// ---------------------------------------------------------------------------

import type { AiDecision, AiModerationResult, VoiceModerationStatus, VoicePosition } from './types';

// ============================================
// System Prompt (Artifact 10 §2.2)
// ============================================

export const MODERATION_SYSTEM_PROMPT = `You are a content moderator for Confluence Ohio, a civic campaign about renaming Columbus, Ohio. You are reviewing a community voice submission.

The campaign publishes perspectives from ALL positions — support, opposition, and undecided. Disagreement is welcome. Your job is NOT to filter opinions but to enforce community guidelines.

REJECT if the submission contains:
- Personal attacks or name-calling directed at specific individuals
- Hate speech, slurs, or dehumanizing language targeting any group
- Threats or incitement to violence
- Spam, commercial content, or off-topic material unrelated to the renaming question
- Clearly AI-generated text (formulaic structure, no personal detail, generic arguments)
- Plagiarized content (verbatim quotes without attribution exceeding 50 words)

FLAG FOR REVIEW if:
- The submission is borderline on any of the above criteria
- The submission contains strong language that may or may not cross the line
- You are less than 85% confident in your assessment
- The submission discusses sensitive historical topics (Indigenous history, slavery, colonialism) that benefit from human editorial judgment

APPROVE if:
- The submission is on-topic, respectful, and appears to be a genuine personal perspective
- You are at least 85% confident it meets all community guidelines
- Strong opinions are fine. Emotional language is fine. Disagreement is expected.

Respond with JSON only:
{
  "decision": "approve" | "reject" | "flag_for_review",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "flagged_issues": ["issue1", "issue2"]
}`;

// ============================================
// Formatting
// ============================================

/** Format a submission for the AI moderation user prompt. */
export function formatSubmissionForModeration(submission: {
  position: VoicePosition;
  author_name: string;
  author_neighborhood: string | null;
  title: string;
  body: string;
}): string {
  return `Position: ${submission.position}
Display Name: ${submission.author_name}
Neighborhood: ${submission.author_neighborhood || 'Not provided'}
Title: ${submission.title || '(no title)'}

Submission:
${submission.body}`;
}

// ============================================
// Decision Mapping (Artifact 10 §2.3)
// ============================================

/**
 * Map an AI moderation decision to the appropriate moderation_status.
 *
 * - approve → auto_approved
 * - flag_for_review → needs_review
 * - reject (confidence >= 0.90) → rejected
 * - reject (confidence < 0.90) → needs_review (not confident enough to auto-reject)
 * - unknown → needs_review (fail open)
 */
export function mapAiDecisionToStatus(
  decision: AiDecision,
  confidence: number,
): VoiceModerationStatus {
  switch (decision) {
    case 'approve':
      return 'auto_approved';
    case 'flag_for_review':
      return 'needs_review';
    case 'reject':
      return confidence >= 0.90 ? 'rejected' : 'needs_review';
    default:
      return 'needs_review';
  }
}

/**
 * Parse the raw AI response text into a typed moderation result.
 * Returns a needs_review result if parsing fails.
 */
export function parseAiModerationResponse(text: string): AiModerationResult {
  try {
    const parsed = JSON.parse(text);
    return {
      decision: parsed.decision || 'flag_for_review',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning || 'Unable to parse AI reasoning',
      flagged_issues: Array.isArray(parsed.flagged_issues) ? parsed.flagged_issues : [],
    };
  } catch {
    return {
      decision: 'flag_for_review',
      confidence: 0,
      reasoning: 'Failed to parse AI moderation response',
      flagged_issues: ['parse_error'],
    };
  }
}
