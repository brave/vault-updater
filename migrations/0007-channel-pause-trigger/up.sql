CREATE FUNCTION channel_pauses_audit() RETURNS trigger AS $cpa$
BEGIN
  IF (NEW.status <> OLD.status) THEN
    IF NEW.status = 'paused' THEN
      INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'pause', 'channel_pause', row_to_json(NEW) );
    ELSE
      INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'resume', 'channel_pause', row_to_json(NEW) );
    END IF;
  END IF;
  RETURN NULL;
END;
$cpa$ LANGUAGE plpgsql;

CREATE TRIGGER channel_pauses_audit AFTER UPDATE ON channels
  FOR EACH ROW EXECUTE PROCEDURE channel_pauses_audit();
