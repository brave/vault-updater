CREATE FUNCTION channel_platform_pauses_audit() RETURNS trigger AS $cppa$
 BEGIN
   IF (TG_OP = 'DELETE') THEN
     INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'resume', 'channel_platform_pause', row_to_json(OLD) );
   ELSIF (TG_OP = 'INSERT') THEN
     INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'pause', 'channel_platform_pause', row_to_json(NEW) );
   END IF;
   RETURN NULL;
 END;
$cppa$ LANGUAGE plpgsql;

CREATE TRIGGER channel_platform_pauses_audit AFTER INSERT OR DELETE ON channel_platform_pauses
  FOR EACH ROW EXECUTE PROCEDURE channel_platform_pauses_audit();
