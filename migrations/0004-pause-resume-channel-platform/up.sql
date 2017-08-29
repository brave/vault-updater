CREATE TABLE channel_platform_pauses (
  channel       TEXT NOT NULL,
  platform      TEXT NOT NULL,
  PRIMARY KEY(channel, platform)
);

ALTER TABLE channel_platform_pauses ADD CONSTRAINT valid_channels_fk FOREIGN KEY (channel) REFERENCES channels(channel);

-- We are only adding platform identifiers that are possible to pause in the updater
ALTER TABLE channel_platform_pauses ADD CONSTRAINT valid_platforms CHECK  ( platform IN ( 'winx64', 'winia32', 'osx' ) );

