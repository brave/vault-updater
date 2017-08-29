CREATE TABLE releases (
  channel      TEXT      NOT NULL,
  platform     TEXT      NOT NULL,
  version      TEXT      NOT NULL,
  name         TEXT      NOT NULL,
  pub_date     TEXT      NOT NULL,
  notes        TEXT      NOT NULL,
  preview      BOOLEAN   NOT NULL,
  url          TEXT,
  ts           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel, platform, version)
);

ALTER TABLE releases ADD CONSTRAINT version_format CHECK ( version ~ '^\d+\.\d+\.\d+$' );
ALTER TABLE releases ADD CONSTRAINT valid_platforms CHECK ( platform IN ( 'osx', 'winx64', 'winia32', 'linux64' ) );
ALTER TABLE releases ADD CONSTRAINT valid_channels CHECK ( channel IN ( 'dev', 'beta', 'stable', 'nightly', 'developer' ) );
