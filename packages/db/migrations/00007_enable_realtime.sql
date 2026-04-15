-- Migration 00007: Enable Supabase Realtime
-- Only campaign_metrics is published — no PII tables exposed via Realtime.

ALTER PUBLICATION supabase_realtime ADD TABLE campaign_metrics;
