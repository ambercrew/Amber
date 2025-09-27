CREATE TRIGGER folders_update_modified_date_after_update
    AFTER UPDATE ON folders
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE folders 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
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

-------------------------------------------------------------------------

CREATE TRIGGER cells_update_modified_date_after_update
    AFTER UPDATE ON cells
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE cells 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
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

-------------------------------------------------------------------------

CREATE TRIGGER reviews_update_modified_date_after_update
    AFTER UPDATE ON reviews
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE reviews 
    SET modified_date = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

