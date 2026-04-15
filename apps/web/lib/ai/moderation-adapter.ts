// ---------------------------------------------------------------------------
// Anthropic Moderation Adapter — apps/web/lib/ai/moderation-adapter.ts
// ---------------------------------------------------------------------------
// Concrete implementation of AiModerationPort using the Anthropic Claude
// API (Haiku 4.5). See Artifact 10 §2.2 for model choice rationale.
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import type { AiModerationPort, ModerationInput } from '@confluenceohio/core/voices/moderate';
import type { AiModerationResult } from '@confluenceohio/core/voices/types';
import {
  MODERATION_SYSTEM_PROMPT,
  formatSubmissionForModeration,
  parseAiModerationResponse,
} from '@confluenceohio/core/voices/moderate';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Creates an AI moderation adapter backed by the Anthropic Claude API.
 */
export function createAnthropicModerator(
  apiKey: string,
  model = DEFAULT_MODEL,
): AiModerationPort {
  const client = new Anthropic({ apiKey });

  return {
    async moderate(input: ModerationInput): Promise<AiModerationResult> {
      try {
        const response = await client.messages.create({
          model,
          max_tokens: 256,
          system: MODERATION_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: formatSubmissionForModeration(input),
            },
          ],
        });

        const text =
          response.content[0].type === 'text' ? response.content[0].text : '';
        return parseAiModerationResponse(text);
      } catch (error) {
        // Fail open: any API error routes to human review (Artifact 10 §2.3)
        const message =
          error instanceof Error ? error.message : 'Unknown AI moderation error';
        return {
          decision: 'flag_for_review',
          confidence: 0,
          reasoning: `AI moderation failed: ${message}`,
          flagged_issues: ['api_error'],
        };
      }
    },
  };
}

/** Singleton adapter instance — reads ANTHROPIC_API_KEY from process.env. */
let _instance: AiModerationPort | null = null;

export function getAiModerator(): AiModerationPort {
  if (!_instance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. ' +
          'Add it to your .env.local file or Vercel environment variables.',
      );
    }
    _instance = createAnthropicModerator(apiKey);
  }
  return _instance;
}
