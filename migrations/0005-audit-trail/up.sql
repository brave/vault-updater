CREATE TABLE audit_entries (
  id        BIGSERIAL NOT NULL PRIMARY KEY,
  ts        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  operation TEXT NOT NULL,
  type      TEXT NOT NULL,
  data      TEXT NOT NULL
);

ALTER TABLE audit_entries ADD CONSTRAINT valid_types CHECK ( type IN ( 'release', 'channel_platform_pause', 'channel_pause' ) );
ALTER TABLE audit_entries ADD CONSTRAINT valid_operations CHECK ( operation IN ( 'insert', 'update', 'delete', 'promote', 'pause', 'resume', 'revert' ) );
