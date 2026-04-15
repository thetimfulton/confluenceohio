// ---------------------------------------------------------------------------
// Unit Tests — packages/core/voices/__tests__/moderate.test.ts
// ---------------------------------------------------------------------------
// Tests for the AI moderation port, moderation helpers, and the
// moderateSubmission flow. Uses mock AiModerationPort implementations
// to cover: clear approval, clear rejection, edge cases, and API failure.
//
// See Artifact 10 §2.2–§2.3 for decision routing spec.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  moderateSubmission,
  type AiModerationPort,
  type ModerationInput,
} from '../moderate';
import {
  parseAiModerationResponse,
  mapAiDecisionToStatus,
  formatSubmissionForModeration,
} from '../moderation';
import type { AiModerationResult } from '../types';

// ============================================
// Test Fixtures
// ============================================

const VALID_SUBMISSION: ModerationInput = {
  position: 'support',
  author_name: 'Jane Doe',
  author_neighborhood: 'Clintonville',
  title: 'The rivers were here first',
  body: 'I grew up in Columbus and I think it is time to acknowledge the real history of this place. The rivers, the Scioto and the Olentangy, were here long before anyone named this city. I support renaming it Confluence because it reflects what actually makes this place special.',
};

const SPAM_SUBMISSION: ModerationInput = {
  position: 'support',
  author_name: 'BuyNow Bot',
  author_neighborhood: null,
  title: 'Great deals!',
  body: 'Buy our amazing products at discount-store.example.com! Best prices guaranteed! Visit now for 50% off everything! Click here: discount-store.example.com/sale',
};

function createMockPort(result: AiModerationResult): AiModerationPort {
  return {
    moderate: async () => result,
  };
}

function createErrorPort(errorMessage: string): AiModerationPort {
  return {
    moderate: async () => {
      throw new Error(errorMessage);
    },
  };
}

// ============================================
// parseAiModerationResponse
// ============================================

describe('parseAiModerationResponse', () => {
  it('parses a valid approval response', () => {
    const raw = JSON.stringify({
      decision: 'approve',
      confidence: 0.95,
      reasoning: 'On-topic, respectful personal perspective',
      flagged_issues: [],
    });

    const result = parseAiModerationResponse(raw);
    expect(result.decision).toBe('approve');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe('On-topic, respectful personal perspective');
    expect(result.flagged_issues).toEqual([]);
  });

  it('parses a valid rejection response', () => {
    const raw = JSON.stringify({
      decision: 'reject',
      confidence: 0.92,
      reasoning: 'Contains personal attacks',
      flagged_issues: ['personal_attack', 'name-calling'],
    });

    const result = parseAiModerationResponse(raw);
    expect(result.decision).toBe('reject');
    expect(result.confidence).toBe(0.92);
    expect(result.flagged_issues).toEqual(['personal_attack', 'name-calling']);
  });

  it('parses a flag_for_review response', () => {
    const raw = JSON.stringify({
      decision: 'flag_for_review',
      confidence: 0.65,
      reasoning: 'Borderline language, discusses sensitive historical topics',
      flagged_issues: ['borderline', 'sensitive_history'],
    });

    const result = parseAiModerationResponse(raw);
    expect(result.decision).toBe('flag_for_review');
    expect(result.confidence).toBe(0.65);
  });

  it('returns flag_for_review on invalid JSON', () => {
    const result = parseAiModerationResponse('not valid json at all');
    expect(result.decision).toBe('flag_for_review');
    expect(result.confidence).toBe(0);
    expect(result.flagged_issues).toContain('parse_error');
  });

  it('returns flag_for_review on empty string', () => {
    const result = parseAiModerationResponse('');
    expect(result.decision).toBe('flag_for_review');
    expect(result.confidence).toBe(0);
  });

  it('handles missing fields gracefully', () => {
    const raw = JSON.stringify({ decision: 'approve' });
    const result = parseAiModerationResponse(raw);
    expect(result.decision).toBe('approve');
    expect(result.confidence).toBe(0);
    expect(result.reasoning).toBe('Unable to parse AI reasoning');
    expect(result.flagged_issues).toEqual([]);
  });

  it('handles non-array flagged_issues', () => {
    const raw = JSON.stringify({
      decision: 'reject',
      confidence: 0.9,
      reasoning: 'Spam',
      flagged_issues: 'spam', // string instead of array
    });
    const result = parseAiModerationResponse(raw);
    expect(result.flagged_issues).toEqual([]);
  });
});

// ============================================
// mapAiDecisionToStatus
// ============================================

describe('mapAiDecisionToStatus', () => {
  it('maps approve → auto_approved', () => {
    expect(mapAiDecisionToStatus('approve', 0.95)).toBe('auto_approved');
  });

  it('maps approve → auto_approved even with low confidence', () => {
    // The AI said approve — we trust it. The confidence threshold
    // is in the system prompt, not in the mapping.
    expect(mapAiDecisionToStatus('approve', 0.5)).toBe('auto_approved');
  });

  it('maps flag_for_review → needs_review', () => {
    expect(mapAiDecisionToStatus('flag_for_review', 0.7)).toBe('needs_review');
  });

  it('maps reject with high confidence (≥0.90) → rejected', () => {
    expect(mapAiDecisionToStatus('reject', 0.90)).toBe('rejected');
    expect(mapAiDecisionToStatus('reject', 0.95)).toBe('rejected');
    expect(mapAiDecisionToStatus('reject', 1.0)).toBe('rejected');
  });

  it('maps reject with low confidence (<0.90) → needs_review', () => {
    expect(mapAiDecisionToStatus('reject', 0.89)).toBe('needs_review');
    expect(mapAiDecisionToStatus('reject', 0.5)).toBe('needs_review');
    expect(mapAiDecisionToStatus('reject', 0.0)).toBe('needs_review');
  });

  it('maps unknown decision → needs_review (fail open)', () => {
    // @ts-expect-error Testing invalid input
    expect(mapAiDecisionToStatus('unknown', 0.9)).toBe('needs_review');
  });
});

// ============================================
// formatSubmissionForModeration
// ============================================

describe('formatSubmissionForModeration', () => {
  it('formats all fields', () => {
    const formatted = formatSubmissionForModeration(VALID_SUBMISSION);
    expect(formatted).toContain('Position: support');
    expect(formatted).toContain('Display Name: Jane Doe');
    expect(formatted).toContain('Neighborhood: Clintonville');
    expect(formatted).toContain('Title: The rivers were here first');
    expect(formatted).toContain('I grew up in Columbus');
  });

  it('handles null neighborhood', () => {
    const formatted = formatSubmissionForModeration({
      ...VALID_SUBMISSION,
      author_neighborhood: null,
    });
    expect(formatted).toContain('Neighborhood: Not provided');
  });

  it('handles empty title', () => {
    const formatted = formatSubmissionForModeration({
      ...VALID_SUBMISSION,
      title: '',
    });
    expect(formatted).toContain('Title: (no title)');
  });
});

// ============================================
// moderateSubmission (integration with mock port)
// ============================================

describe('moderateSubmission', () => {
  it('routes clear approval to auto_approved', async () => {
    const port = createMockPort({
      decision: 'approve',
      confidence: 0.95,
      reasoning: 'On-topic, genuine perspective',
      flagged_issues: [],
    });

    const outcome = await moderateSubmission(port, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('auto_approved');
    expect(outcome.aiResult.decision).toBe('approve');
    expect(outcome.aiResult.confidence).toBe(0.95);
  });

  it('routes high-confidence rejection to rejected', async () => {
    const port = createMockPort({
      decision: 'reject',
      confidence: 0.95,
      reasoning: 'Spam/commercial content',
      flagged_issues: ['spam', 'commercial_content'],
    });

    const outcome = await moderateSubmission(port, SPAM_SUBMISSION);
    expect(outcome.newStatus).toBe('rejected');
    expect(outcome.aiResult.flagged_issues).toContain('spam');
  });

  it('routes low-confidence rejection to needs_review', async () => {
    const port = createMockPort({
      decision: 'reject',
      confidence: 0.75,
      reasoning: 'Possibly off-topic, but unsure',
      flagged_issues: ['off-topic'],
    });

    const outcome = await moderateSubmission(port, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('needs_review');
  });

  it('routes flag_for_review to needs_review', async () => {
    const port = createMockPort({
      decision: 'flag_for_review',
      confidence: 0.6,
      reasoning: 'Discusses sensitive historical topics',
      flagged_issues: ['sensitive_history'],
    });

    const outcome = await moderateSubmission(port, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('needs_review');
  });

  it('handles API failure by failing open to needs_review', async () => {
    // When the port itself throws (simulating createAnthropicModerator
    // catching the error and returning a fail-open result)
    const failOpenPort = createMockPort({
      decision: 'flag_for_review',
      confidence: 0,
      reasoning: 'AI moderation failed: Connection timeout',
      flagged_issues: ['api_error'],
    });

    const outcome = await moderateSubmission(failOpenPort, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('needs_review');
    expect(outcome.aiResult.flagged_issues).toContain('api_error');
    expect(outcome.aiResult.confidence).toBe(0);
  });

  it('passes submission data through to the port', async () => {
    let receivedInput: ModerationInput | null = null;
    const spyPort: AiModerationPort = {
      moderate: async (input) => {
        receivedInput = input;
        return {
          decision: 'approve',
          confidence: 0.9,
          reasoning: 'ok',
          flagged_issues: [],
        };
      },
    };

    await moderateSubmission(spyPort, VALID_SUBMISSION);
    expect(receivedInput).toEqual(VALID_SUBMISSION);
  });

  it('handles exact 0.90 rejection confidence as rejected', async () => {
    const port = createMockPort({
      decision: 'reject',
      confidence: 0.90,
      reasoning: 'Clear violation',
      flagged_issues: ['hate_speech'],
    });

    const outcome = await moderateSubmission(port, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('rejected');
  });

  it('handles 0.899 rejection confidence as needs_review', async () => {
    const port = createMockPort({
      decision: 'reject',
      confidence: 0.899,
      reasoning: 'Borderline violation',
      flagged_issues: ['borderline'],
    });

    const outcome = await moderateSubmission(port, VALID_SUBMISSION);
    expect(outcome.newStatus).toBe('needs_review');
  });
});
