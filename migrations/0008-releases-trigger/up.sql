CREATE FUNCTION releases_audit() RETURNS trigger AS $ra$
BEGIN
   IF (TG_OP = 'DELETE') THEN
     INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'revert', 'release', row_to_json(OLD) );
   ELSIF (TG_OP = 'INSERT') THEN
     INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'insert', 'release', row_to_json(NEW) );
   ELSIF (TG_OP = 'UPDATE') THEN
    IF (NEW.preview <> OLD.preview) THEN
      INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'promote', 'release', row_to_json(NEW) );
    ELSE
      INSERT INTO audit_entries ( operation, type, data ) VALUES ( 'update', 'release', row_to_json(NEW) );
    END IF;
  END IF;
  RETURN NULL;
END;
$ra$ LANGUAGE plpgsql;

CREATE TRIGGER releases_audit AFTER UPDATE OR INSERT OR DELETE ON releases
  FOR EACH ROW EXECUTE PROCEDURE releases_audit();
