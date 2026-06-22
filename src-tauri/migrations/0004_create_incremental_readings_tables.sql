CREATE TABLE IF NOT EXISTS incremental_reading_schedules (
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT(datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT(datetime('now')),
    cell_id                     TEXT        NOT NULL        UNIQUE REFERENCES cells(id) ON DELETE CASCADE,
    priority                    TEXT        NOT NULL        DEFAULT '"Normal"',
    title                       TEXT        NOT NULL        DEFAULT '',
    next_reading_date           TEXT        NOT NULL        DEFAULT(datetime('now')),
    completed                   INTEGER     NOT NULL        DEFAULT 0,
    has_extracts                INTEGER     NOT NULL        DEFAULT 0
);

CREATE INDEX IF NOT EXISTS incremental_reading_schedules_cell_id_index
    ON incremental_reading_schedules(cell_id);

CREATE TRIGGER incremental_reading_schedules_update_modified_date_after_update
    AFTER UPDATE ON incremental_reading_schedules
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE incremental_reading_schedules
    SET modified_date = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER incremental_reading_schedules_add_to_deleted_entities_after_delete
    AFTER DELETE ON incremental_reading_schedules
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('incremental_reading_schedules', OLD.id, OLD.created_date, datetime('now'));
END;

-------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS extracts (
    id                        TEXT        NOT NULL        PRIMARY KEY,
    created_date              TEXT        NOT NULL        DEFAULT(datetime('now')),
    modified_date             TEXT        NOT NULL        DEFAULT(datetime('now')),
    cell_id                   TEXT        NOT NULL        REFERENCES cells(id) ON DELETE CASCADE,
    status                    TEXT        NOT NULL        DEFAULT '"Pending"'
);

CREATE INDEX IF NOT EXISTS extracts_cell_id_index ON extracts(cell_id);

CREATE TRIGGER extracts_update_modified_date_after_update
    AFTER UPDATE ON extracts
    WHEN OLD.modified_date == NEW.modified_date
BEGIN
    UPDATE extracts
    SET modified_date = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER extracts_add_to_deleted_entities_after_delete
    AFTER DELETE ON extracts
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('extracts', OLD.id, OLD.created_date, datetime('now'));
END;

