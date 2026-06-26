CREATE TRIGGER fsrs_profiles_update_modified_date_after_update
    AFTER UPDATE ON fsrs_profiles
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE fsrs_profiles 
    SET modified_date = datetime('now') 
    WHERE id = NEW.id;
END;

CREATE TRIGGER fsrs_profiles_add_to_deleted_entities_after_delete
    AFTER DELETE ON fsrs_profiles
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('fsrs_profiles', OLD.id, OLD.created_date, datetime('now'));
END;


CREATE TRIGGER concepts_update_modified_at_after_update
    AFTER UPDATE ON concepts
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE concepts
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER concepts_add_to_deleted_entities_after_delete
    AFTER DELETE ON concepts
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('concepts', OLD.id, OLD.created_at, datetime('now'));
END;


CREATE TRIGGER readings_update_modified_at_after_update
    AFTER UPDATE ON readings
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE readings
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER readings_add_to_deleted_entities_after_delete
    AFTER DELETE ON readings
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('readings', OLD.id, OLD.created_at, datetime('now'));
END;


CREATE TRIGGER extracts_update_modified_at_after_update
    AFTER UPDATE ON extracts
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE extracts
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER extracts_add_to_deleted_entities_after_delete
    AFTER DELETE ON extracts
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('extracts', OLD.id, OLD.created_at, datetime('now'));
END;


CREATE TRIGGER cards_update_modified_at_after_update
    AFTER UPDATE ON cards
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE cards
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER cards_add_to_deleted_entities_after_delete
    AFTER DELETE ON cards
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('cards', OLD.id, OLD.created_at, datetime('now'));
END;

