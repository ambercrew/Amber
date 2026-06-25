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

