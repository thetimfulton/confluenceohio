// ---------------------------------------------------------------------------
// AI Moderation Port — packages/core/voices/moderate.ts
// ---------------------------------------------------------------------------
// Defines the port interface for AI moderation and a convenience function
// that wraps the full moderate-and-classify flow. The concrete adapter
// (Anthropic Claude) lives in apps/web — packages/core never imports
// infrastructure SDKs directly (hexagonal architecture).
//
// See Artifact 10 §2.2 for the full moderation spec.
// ---------------------------------------------------------------------------

import type { AiModerationResult, VoiceModerationStatus, VoicePosition } from './types';
import {
  MODERATION_SYSTEM_PROMPT,
  formatSubmissionForModeration,
  mapAiDecisionToStatus,
  parseAiModerationResponse,
} from './moderation';

// Re-export for consumer convenience
export { MODERATION_SYSTEM_PROMPT, formatSubmissionForModeration, parseAiModerationResponse };

/** Minimal submission data needed for moderation. */
export interface ModerationInput {
  position: VoicePosition;
  author_name: string;
  author_neighborhood: string | null;
  title: string;
  body: string;
}

/**
 * Port interface for AI moderation. Infrastructure adapters (Anthropic,
 * OpenAI, etc.) implement this. Tests inject mocks via this interface.
 */
export interface AiModerationPort {
  moderate(input: ModerationInput): Promise<AiModerationResult>;
}

/** Full result including the derived moderation status. */
export interface ModerationOutcome {
  aiResult: AiModerationResult;
  newStatus: VoiceModerationStatus;
}

/**
 * Run AI moderation on a submission and map the result to a status.
 * This is the main entry point consumed by the Inngest function.
 *
 * If the AI call fails, the adapter should return a `flag_for_review`
 * result (fail open). This function maps that to `needs_review`.
 */
export async function moderateSubmission(
  port: AiModerationPort,
  input: ModerationInput,
): Promise<ModerationOutcome> {
  const aiResult = await port.moderate(input);
  const newStatus = mapAiDecisionToStatus(aiResult.decision, aiResult.confidence);

  return { aiResult, newStatus };
}
