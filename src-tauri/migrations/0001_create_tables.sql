CREATE TABLE deleted_entities(
    entity_id                   TEXT        NOT NULL,
    entity_name                 TEXT        NOT NULL,
    entity_created_at           TEXT        NOT NULL        DEFAULT (datetime('now')),
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

CREATE TABLE fsrs_profiles(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
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

CREATE TRIGGER fsrs_profiles_update_modified_at_after_update
    AFTER UPDATE OF name, request_retention, maximum_interval, weights ON fsrs_profiles
BEGIN
    UPDATE fsrs_profiles
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER fsrs_profiles_add_to_deleted_entities_after_delete
    AFTER DELETE ON fsrs_profiles
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    VALUES ('fsrs_profiles', OLD.id, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------

CREATE TABLE tags(
    name                        TEXT        NOT NULL        PRIMARY KEY,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now'))
);

CREATE TRIGGER tags_update_modified_at_after_update
    AFTER UPDATE OF name ON tags
BEGIN
    UPDATE tags
    SET modified_at = datetime('now')
    WHERE name = NEW.name;
END;

-- If a tag is re-created after being deleted, it is no longer deleted.
CREATE TRIGGER tags_remove_from_deleted_entities_after_insert
    AFTER INSERT ON tags
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'tags'
      AND entity_id = NEW.name;
END;

-- Delete before insert to avoid duplicates when the same tag is removed multiple times.
CREATE TRIGGER tags_add_to_deleted_entities_after_delete
    AFTER DELETE ON tags
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'tags'
      AND entity_id = OLD.name;
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    VALUES ('tags', OLD.name, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------

CREATE TABLE tag_parents(
    tag_id                      TEXT        NOT NULL,
    parent_tag_id               TEXT        NOT NULL,
    sort_index                  INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    PRIMARY KEY (tag_id, parent_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(name) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(name) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX tag_parents_tag_id_index ON tag_parents(tag_id);
CREATE INDEX tag_parents_parent_tag_id_index ON tag_parents(parent_tag_id);

CREATE TRIGGER tag_parents_update_modified_at_after_update
    AFTER UPDATE OF sort_index ON tag_parents
BEGIN
    UPDATE tag_parents
    SET modified_at = datetime('now')
    WHERE tag_id = NEW.tag_id AND parent_tag_id = NEW.parent_tag_id;
END;

-- If a relationship is re-created after being deleted, it is no longer deleted.
CREATE TRIGGER tag_parents_remove_from_deleted_entities_after_insert
    AFTER INSERT ON tag_parents
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'tag_parents'
      AND entity_id = NEW.tag_id || ':' || NEW.parent_tag_id;
END;

-- Delete before insert to avoid duplicates when the same relationship is removed multiple times.
CREATE TRIGGER tag_parents_add_to_deleted_entities_after_delete
    AFTER DELETE ON tag_parents
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'tag_parents'
      AND entity_id = OLD.tag_id || ':' || OLD.parent_tag_id;
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    VALUES ('tag_parents', OLD.tag_id || ':' || OLD.parent_tag_id, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------

-- Element tables are created before meta (no FK to meta) so that meta can
-- reference them. The reverse constraint (element must have a meta row)
-- is enforced by the application inserting meta before the element row.

CREATE TABLE folders(
    id TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE readings(
    id          TEXT NOT NULL PRIMARY KEY,
    body        TEXT NOT NULL
);

CREATE TABLE extracts(
    id   TEXT NOT NULL PRIMARY KEY,
    -- TODO: rename to body or something else like readings
    text TEXT NOT NULL
);

CREATE TABLE cards(
    id    TEXT NOT NULL PRIMARY KEY,
    front TEXT NOT NULL,
    back  TEXT NOT NULL
);

-------------------------------------------------------------------------

CREATE TABLE meta(
    element_id   TEXT    NOT NULL PRIMARY KEY,
    element_type TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    position     BLOB    NOT NULL,
    parent_id    TEXT,
    parent_type  TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX meta_parent_id_index ON meta(parent_id);

CREATE TRIGGER meta_update_modified_at_after_update
    AFTER UPDATE OF name, parent_id, parent_type, position ON meta
BEGIN
    UPDATE meta
    SET modified_at = datetime('now')
    WHERE element_id = NEW.element_id;
END;

-- Delete children recursively.
CREATE TRIGGER meta_cascade_delete_children_after_delete
    AFTER DELETE ON meta
BEGIN
    DELETE FROM meta WHERE parent_id = OLD.element_id;
END;

-- Delete the corresponding element row when a meta row is deleted.
CREATE TRIGGER meta_delete_element_after_delete
    AFTER DELETE ON meta
BEGIN
    DELETE FROM folders  WHERE id = OLD.element_id;
    DELETE FROM readings WHERE id = OLD.element_id;
    DELETE FROM extracts WHERE id = OLD.element_id;
    DELETE FROM cards    WHERE id = OLD.element_id;
END;

-------------------------------------------------------------------------

CREATE TABLE element_tags(
    element_id  TEXT        NOT NULL,
    tag_id      TEXT        NOT NULL,
    sort_index  INTEGER     NOT NULL        DEFAULT 0,
    created_at  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at TEXT        NOT NULL        DEFAULT (datetime('now')),
    PRIMARY KEY (element_id, tag_id),
    FOREIGN KEY (element_id) REFERENCES meta(element_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(name) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX element_tags_tag_id_index ON element_tags(tag_id);

-- If a relationship is re-created after being deleted, it is no longer deleted.
CREATE TRIGGER element_tags_remove_from_deleted_entities_after_insert
    AFTER INSERT ON element_tags
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'element_tags'
      AND entity_id = NEW.element_id || ':' || NEW.tag_id;
END;

CREATE TRIGGER element_tags_update_modified_at_after_update
    AFTER UPDATE OF sort_index ON element_tags
BEGIN
    UPDATE element_tags
    SET modified_at = datetime('now')
    WHERE element_id = NEW.element_id AND tag_id = NEW.tag_id;
END;

-- Delete before insert to avoid duplicates when the same relationship is removed multiple times.
CREATE TRIGGER element_tags_add_to_deleted_entities_after_delete
    AFTER DELETE ON element_tags
BEGIN
    DELETE FROM deleted_entities
    WHERE entity_name = 'element_tags'
      AND entity_id = OLD.element_id || ':' || OLD.tag_id;
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    VALUES ('element_tags', OLD.element_id || ':' || OLD.tag_id, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------

CREATE TRIGGER folders_add_to_deleted_entities_after_delete
    AFTER DELETE ON folders
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    SELECT 'folders', OLD.id, created_at, datetime('now')
    FROM meta WHERE element_id = OLD.id;
END;

CREATE TRIGGER folders_delete_meta_after_delete
    AFTER DELETE ON folders
BEGIN
    DELETE FROM meta WHERE element_id = OLD.id;
END;

-------------------------------------------------------------------------

CREATE TRIGGER readings_add_to_deleted_entities_after_delete
    AFTER DELETE ON readings
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    SELECT 'readings', OLD.id, created_at, datetime('now')
    FROM meta WHERE element_id = OLD.id;
END;

CREATE TRIGGER readings_delete_meta_after_delete
    AFTER DELETE ON readings
BEGIN
    DELETE FROM meta WHERE element_id = OLD.id;
END;

-------------------------------------------------------------------------

CREATE TRIGGER extracts_add_to_deleted_entities_after_delete
    AFTER DELETE ON extracts
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    SELECT 'extracts', OLD.id, created_at, datetime('now')
    FROM meta WHERE element_id = OLD.id;
END;

CREATE TRIGGER extracts_delete_meta_after_delete
    AFTER DELETE ON extracts
BEGIN
    DELETE FROM meta WHERE element_id = OLD.id;
END;

-------------------------------------------------------------------------

CREATE TRIGGER cards_add_to_deleted_entities_after_delete
    AFTER DELETE ON cards
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    SELECT 'cards', OLD.id, created_at, datetime('now')
    FROM meta WHERE element_id = OLD.id;
END;

CREATE TRIGGER cards_delete_meta_after_delete
    AFTER DELETE ON cards
BEGIN
    DELETE FROM meta WHERE element_id = OLD.id;
END;
