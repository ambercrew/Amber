-- TODO: use created_at and modified_at
CREATE TABLE fsrs_profiles(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    name                        TEXT        NOT NULL,
    request_retention           REAL        NOT NULL,
    maximum_interval            REAL        NOT NULL,
    weights                     TEXT        NOT NULL
);

-- The id of root is 00000000-0000-0000-0000-000000000002
INSERT INTO fsrs_profiles(
    id,
    name,
    request_retention,
    maximum_interval,
    weights) VALUES (
    X'00000000000000000000000000000002',
    'Default',
    0.9,
    36500,
    '0.212 1.2931 2.3065 8.2956 6.4133 0.8334 3.0194 0.001 1.8722 0.1666 0.796 1.4835 0.0614 0.2629 1.6483 0.6014 1.8729 0.5425 0.0912 0.0658 0.1542'
);

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


-------------------------------------------------------------------------

CREATE TABLE deleted_entities(
    entity_id                   TEXT        NOT NULL,
    entity_name                 TEXT        NOT NULL,
    entity_created_date         TEXT        NOT NULL        DEFAULT (datetime('now')),
    deleted_date                TEXT        NOT NULL        DEFAULT (datetime('now'))
);

CREATE INDEX deleted_entities_entity_id_and_name_index ON deleted_entities(entity_id, entity_name);
CREATE INDEX deleted_entities_deleted_date_index ON deleted_entities(deleted_date);

-------------------------------------------------------------------------

CREATE TABLE local_configurations(
    name                        TEXT        NOT NULL        PRIMARY KEY,
    value                       TEXT        NOT NULL
);

-------------------------------------------------------------------------

CREATE TABLE tags(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    BLOB        NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now'))
);

CREATE TABLE tag_parents(
    tag_id                      TEXT        NOT NULL,
    parent_tag_id               TEXT        NOT NULL,
    PRIMARY KEY (tag_id, parent_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- TODO: create relationship with elements using a common way using triggers for deletion

CREATE INDEX tag_parents_tag_id_index ON tag_parents(tag_id);
CREATE INDEX tag_parents_parent_tag_id_index ON tag_parents(parent_tag_id);

CREATE TABLE folder_tags(
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tag_id    TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (folder_id, tag_id)
);

CREATE TABLE reading_tags(
    reading_id TEXT NOT NULL REFERENCES readings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (reading_id, tag_id)
);

CREATE TABLE extract_tags(
    extract_id TEXT NOT NULL REFERENCES extracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id)     ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (extract_id, tag_id)
);

CREATE TABLE card_tags(
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE ON UPDATE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (card_id, tag_id)
);

CREATE TRIGGER tags_update_modified_at_after_update
    AFTER UPDATE ON tags
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE tags
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER tags_add_to_deleted_entities_after_delete
    AFTER DELETE ON tags
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    VALUES ('tags', OLD.id, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------
-- Element tables are created first (no FK to meta) so that meta can
-- reference them. The reverse constraint (element must have a meta row)
-- is enforced by the application inserting meta before the element row.

CREATE TABLE folders(
    id TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE readings(
    id          TEXT NOT NULL PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_url  TEXT,
    body        TEXT NOT NULL
);

CREATE TABLE extracts(
    id   TEXT NOT NULL PRIMARY KEY,
    text TEXT NOT NULL
);

CREATE TABLE cards(
    id    TEXT NOT NULL PRIMARY KEY,
    front TEXT NOT NULL,
    back  TEXT NOT NULL
);

-------------------------------------------------------------------------

CREATE TABLE meta(
    id                  TEXT        NOT NULL PRIMARY KEY,
    name                TEXT        NOT NULL,
    position            BLOB        NOT NULL,
    parent_reading_id   TEXT        REFERENCES readings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    parent_extract_id   TEXT        REFERENCES extracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    parent_folder_id    TEXT        REFERENCES folders(id)  ON DELETE CASCADE ON UPDATE CASCADE,
    parent_card_id      TEXT        REFERENCES cards(id)    ON DELETE CASCADE ON UPDATE CASCADE,
    created_at          TEXT        NOT NULL DEFAULT (datetime('now')),
    modified_at         TEXT        NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX meta_parent_reading_id_index ON meta(parent_reading_id);
CREATE INDEX meta_parent_extract_id_index ON meta(parent_extract_id);
CREATE INDEX meta_parent_folder_id_index  ON meta(parent_folder_id);
CREATE INDEX meta_parent_card_id_index    ON meta(parent_card_id);

CREATE TRIGGER meta_update_modified_at_after_update
    AFTER UPDATE ON meta
    WHEN OLD.modified_at == NEW.modified_at
BEGIN
    UPDATE meta
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

-- When a meta row is cascade-deleted (e.g. because its parent was deleted),
-- delete the corresponding element row so there are no orphaned element rows.
CREATE TRIGGER meta_delete_element_after_delete
    AFTER DELETE ON meta
BEGIN
    DELETE FROM folders  WHERE id = OLD.id;
    DELETE FROM readings WHERE id = OLD.id;
    DELETE FROM extracts WHERE id = OLD.id;
    DELETE FROM cards    WHERE id = OLD.id;
END;

----------- Element → meta delete triggers
-- These fire when an element is explicitly deleted and clean up the meta row.
-- Logging triggers are registered first so they run before meta is removed.

CREATE TRIGGER folders_add_to_deleted_entities_after_delete
    AFTER DELETE ON folders
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    SELECT 'folders', OLD.id, created_at, datetime('now')
    FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER folders_delete_meta_after_delete
    AFTER DELETE ON folders
BEGIN
    DELETE FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER readings_add_to_deleted_entities_after_delete
    AFTER DELETE ON readings
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    SELECT 'readings', OLD.id, created_at, datetime('now')
    FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER readings_delete_meta_after_delete
    AFTER DELETE ON readings
BEGIN
    DELETE FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER extracts_add_to_deleted_entities_after_delete
    AFTER DELETE ON extracts
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    SELECT 'extracts', OLD.id, created_at, datetime('now')
    FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER extracts_delete_meta_after_delete
    AFTER DELETE ON extracts
BEGIN
    DELETE FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER cards_add_to_deleted_entities_after_delete
    AFTER DELETE ON cards
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_date, deleted_date)
    SELECT 'cards', OLD.id, created_at, datetime('now')
    FROM meta WHERE id = OLD.id;
END;

CREATE TRIGGER cards_delete_meta_after_delete
    AFTER DELETE ON cards
BEGIN
    DELETE FROM meta WHERE id = OLD.id;
END;

