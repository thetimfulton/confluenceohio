'use client';

/**
 * Reusable form analytics hook (Artifact 13 §8.1).
 *
 * Tracks form interaction events with automatic field timing:
 *   - {formName}_form_started on first field interaction
 *   - {formName}_field_completed on each field blur
 *   - {formName}_form_submitted on submit
 *
 * Usage:
 *   const { trackFormStart, trackFieldFocus, trackFieldComplete, trackFormSubmit }
 *     = useFormAnalytics({ formName: 'petition' });
 */

import { useCallback, useRef } from 'react';
import { trackEvent } from '@confluenceohio/core/analytics/track-event';

interface FormAnalyticsOptions {
  /** Domain prefix for event names (e.g., 'petition', 'volunteer', 'voice') */
  formName: string;
}

export function useFormAnalytics({ formName }: FormAnalyticsOptions) {
  const hasStarted = useRef(false);
  const fieldTimers = useRef<Record<string, number>>({});

  /**
   * Call on first interaction with any field.
   * Fires `{formName}_form_started` exactly once per form lifecycle.
   */
  const trackFormStart = useCallback(
    (firstField: string) => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        trackEvent(`${formName}_form_started`, { first_field: firstField });
      }
    },
    [formName],
  );

  /**
   * Call on field focus to start the timer for that field.
   */
  const trackFieldFocus = useCallback((fieldName: string) => {
    fieldTimers.current[fieldName] = Date.now();
  }, []);

  /**
   * Call on field blur to fire `{formName}_field_completed`.
   * Includes `time_to_complete_ms` if focus was tracked.
   */
  const trackFieldComplete = useCallback(
    (fieldName: string, isValid: boolean) => {
      const startTime = fieldTimers.current[fieldName];
      const timeToComplete = startTime ? Date.now() - startTime : undefined;

      trackEvent(`${formName}_field_completed`, {
        field_name: fieldName,
        field_valid: isValid,
        ...(timeToComplete !== undefined && {
          time_to_complete_ms: timeToComplete,
        }),
      });
    },
    [formName],
  );

  /**
   * Call on form submission.
   * Fires `{formName}_form_submitted` with optional extra properties.
   */
  const trackFormSubmit = useCallback(
    (properties?: Record<string, unknown>) => {
      trackEvent(`${formName}_form_submitted`, properties);
    },
    [formName],
  );

  /**
   * Reset the started flag (e.g., after successful submission
   * if the form can be reused).
   */
  const reset = useCallback(() => {
    hasStarted.current = false;
    fieldTimers.current = {};
  }, []);

  return {
    trackFormStart,
    trackFieldFocus,
    trackFieldComplete,
    trackFormSubmit,
    reset,
  };
}
