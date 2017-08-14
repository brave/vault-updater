CREATE TABLE extensions (
  channel TEXT NOT NULL, 	
  id TEXT NOT NULL,
  version TEXT NOT NULL,
  hash TEXT NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (channel, id),
  UNIQUE (channel, name),
  UNIQUE (channel, hash)
);

ALTER TABLE extensions ADD CONSTRAINT valid_channels CHECK ( channel IN ( 'dev', 'beta', 'stable' ) );
ALTER TABLE extensions ADD CONSTRAINT id_format CHECK ( id ~ '^[a-z]+$' );
ALTER TABLE extensions ADD CONSTRAINT version_format CHECK ( version ~ '^[0-9\.]+$' );
ALTER TABLE extensions ADD CONSTRAINT hash_format CHECK ( hash ~ '^[a-z0-9]+$' );
