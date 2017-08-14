CREATE TABLE channels (
  channel       TEXT NOT NULL PRIMARY KEY,
  description   TEXT NOT NULL,
  label         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
);

ALTER TABLE channels ADD CONSTRAINT status_values CHECK ( status IN ('active', 'paused') );

INSERT INTO channels (channel, description, label)
VALUES
  ('dev', 'Release channel', 'Release'),
  ('beta', 'Beta channel', 'Beta'),
  ('stable', 'Stable channel', 'Stable'),
  ('developer', 'Developer channel', 'Developer'),
  ('nightly', 'Nightly channel', 'Nightly')
;
