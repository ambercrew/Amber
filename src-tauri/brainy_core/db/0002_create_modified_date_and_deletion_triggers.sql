CREATE TRIGGER folders_update_modified_date_after_update
    AFTER UPDATE ON folders
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE folders 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER folders_add_to_deleted_entities_after_delete
    AFTER DELETE ON folders
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('folders', OLD.id, OLD.created_date, CURRENT_TIMESTAMP);
END;

-------------------------------------------------------------------------

CREATE TRIGGER files_update_modified_date_after_update
    AFTER UPDATE ON files
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE files 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER files_add_to_deleted_entities_after_delete
    AFTER DELETE ON files
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('files', OLD.id, OLD.created_date, CURRENT_TIMESTAMP);
END;

-------------------------------------------------------------------------

CREATE TRIGGER cells_update_modified_date_after_update
    AFTER UPDATE ON cells
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE cells 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER cells_add_to_deleted_entities_after_delete
    AFTER DELETE ON cells
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('cells', OLD.id, OLD.created_date, CURRENT_TIMESTAMP);
END;

-------------------------------------------------------------------------

CREATE TRIGGER repetitions_update_modified_date_after_update
    AFTER UPDATE ON repetitions
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE repetitions 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER repetitions_add_to_deleted_entities_after_delete
    AFTER DELETE ON repetitions
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('repetitions', OLD.id, OLD.created_date, CURRENT_TIMESTAMP);
END;

-------------------------------------------------------------------------

CREATE TRIGGER reviews_update_modified_date_after_update
    AFTER UPDATE ON reviews
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE reviews 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

CREATE TRIGGER reviews_add_to_deleted_entities_after_delete
    AFTER DELETE ON reviews
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('reviews', OLD.id, OLD.created_date, CURRENT_TIMESTAMP);
END;

