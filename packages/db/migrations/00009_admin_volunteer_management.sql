-- Migration 00009: Admin volunteer management
-- Adds admin role expansion, volunteer admin notes table, and supporting indexes.

-- ── 1. Expand admin_role enum ──────────────────────────────────────────────
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE admin_role ADD VALUE IF NOT EXISTS 'viewer';

-- ── 2. Add onboarded_at column to volunteers ───────────────────────────────
ALTER TABLE volunteers ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

-- ── 3. Create volunteer_admin_notes table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteer_admin_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id  uuid NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  admin_id      uuid NOT NULL REFERENCES admin_users(id),
  admin_email   text NOT NULL,
  content       text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 4. RLS on volunteer_admin_notes ────────────────────────────────────────
ALTER TABLE volunteer_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and viewer can read volunteer notes"
  ON volunteer_admin_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'viewer')
  ));

CREATE POLICY "Admin can insert volunteer notes"
  ON volunteer_admin_notes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
      AND role = 'admin'
  ));

-- ── 5. Add update policy for volunteers ────────────────────────────────────
CREATE POLICY "Admin can update volunteers"
  ON volunteers FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
      AND role = 'admin'
  ));

-- ── 6. Indexes ─────────────────────────────────────────────────────────────
-- Volunteer list filtering and sorting
CREATE INDEX IF NOT EXISTS idx_volunteers_status
  ON volunteers (status);

CREATE INDEX IF NOT EXISTS idx_volunteers_signed_up_at
  ON volunteers (signed_up_at DESC);

CREATE INDEX IF NOT EXISTS idx_volunteers_roles
  ON volunteers USING gin (roles jsonb_path_ops);

-- Admin notes lookup
CREATE INDEX IF NOT EXISTS idx_volunteer_notes_volunteer_id
  ON volunteer_admin_notes (volunteer_id);

CREATE INDEX IF NOT EXISTS idx_volunteer_notes_created_at
  ON volunteer_admin_notes (created_at DESC);
