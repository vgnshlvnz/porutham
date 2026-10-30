-- One-time porutham snapshots. The token is the id (32 random bytes, base64url).
-- snapshot is the redacted match report, not raw birth details.
CREATE TABLE IF NOT EXISTS shares (
  token TEXT PRIMARY KEY,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS shares_expires_at ON shares (expires_at);
