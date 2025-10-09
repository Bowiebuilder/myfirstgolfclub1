PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  last_initial TEXT,
  city TEXT,
  country TEXT NOT NULL,
  course_name TEXT NOT NULL,
  first_round_date TEXT,
  story TEXT,
  photo_key TEXT,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_country ON submissions(country);
CREATE INDEX IF NOT EXISTS idx_submissions_latlng ON submissions(lat, lng);