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

CREATE TABLE study_profiles(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    name                        TEXT        NOT NULL,
    is_default                  INTEGER     NOT NULL        DEFAULT 0,
    -- FSRS (cards)
    desired_retention           REAL        NOT NULL,
    fsrs_params                 TEXT,
    -- Incremental reading (readings/extracts)
    initial_a_factor            REAL        NOT NULL,
    initial_interval_days       REAL        NOT NULL,
    min_interval_days           REAL        NOT NULL
);

CREATE TRIGGER study_profiles_update_modified_at_after_update
    AFTER UPDATE OF name, is_default, desired_retention, fsrs_params, initial_a_factor, initial_interval_days, min_interval_days ON study_profiles
BEGIN
    UPDATE study_profiles
    SET modified_at = datetime('now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER study_profiles_add_to_deleted_entities_after_delete
    AFTER DELETE ON study_profiles
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    VALUES ('study_profiles', OLD.id, OLD.created_at, datetime('now'));
END;

-------------------------------------------------------------------------

-- Element tables are created before meta (no FK to meta) so that meta can
-- reference them. The reverse constraint (element must have a meta row)
-- is enforced by the application inserting meta before the element row.

CREATE TABLE folders(
    id TEXT NOT NULL PRIMARY KEY
);

CREATE TABLE readings(
    id                     TEXT    NOT NULL PRIMARY KEY,
    content                TEXT    NOT NULL,
    position_block_index   INTEGER NOT NULL DEFAULT 0,
    a_factor               REAL    NOT NULL DEFAULT 1.2
);

CREATE TABLE extracts(
    id       TEXT NOT NULL PRIMARY KEY,
    content  TEXT NOT NULL,
    a_factor REAL NOT NULL DEFAULT 1.2
);

CREATE TABLE cards(
    id    TEXT NOT NULL PRIMARY KEY,
    front TEXT NOT NULL,
    back  TEXT NOT NULL
);

-------------------------------------------------------------------------

CREATE TABLE meta(
    element_id        TEXT    NOT NULL PRIMARY KEY,
    element_type      TEXT    NOT NULL,
    name              TEXT    NOT NULL,
    position          BLOB    NOT NULL,
    parent_id         TEXT,
    parent_type       TEXT,
    study_profile_id  TEXT,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
    modified_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (study_profile_id) REFERENCES study_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
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

-------------------------------------------------------------------------

CREATE TABLE card_reviews(
    card_id         TEXT        NOT NULL        PRIMARY KEY,
    due             TEXT        NOT NULL,
    stability       REAL        NOT NULL,
    difficulty      REAL        NOT NULL,
    reps            INTEGER     NOT NULL        DEFAULT 0,
    lapses          INTEGER     NOT NULL        DEFAULT 0,
    state           TEXT        NOT NULL,
    last_reviewed   TEXT,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Keep the card's meta modified_at in sync whenever its review state changes.
CREATE TRIGGER card_reviews_update_meta_modified_at_after_update
    AFTER UPDATE ON card_reviews
BEGIN
    UPDATE meta
    SET modified_at = datetime('now')
    WHERE element_id = NEW.card_id;
END;

-------------------------------------------------------------------------

-- Shared by readings and extracts, so it references meta(element_id) rather
-- than either element table directly.
CREATE TABLE reading_reviews(
    element_id      TEXT        NOT NULL        PRIMARY KEY,
    due             TEXT        NOT NULL,
    interval_days   REAL        NOT NULL,
    last_reviewed   TEXT,
    finished_at     TEXT,
    FOREIGN KEY (element_id) REFERENCES meta(element_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Keep the element's meta modified_at in sync whenever its review state changes.
CREATE TRIGGER reading_reviews_update_meta_modified_at_after_update
    AFTER UPDATE ON reading_reviews
BEGIN
    UPDATE meta
    SET modified_at = datetime('now')
    WHERE element_id = NEW.element_id;
END;

-------------------------------------------------------------------------

-- History is kept even after the card is deleted, so the FK only clears the
-- reference rather than removing the log row.
CREATE TABLE card_review_logs(
    id              TEXT        NOT NULL        PRIMARY KEY,
    card_id         TEXT,
    reviewed_at     TEXT        NOT NULL,
    rating          TEXT        NOT NULL,
    duration_ms     INTEGER,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX card_review_logs_card_id_index ON card_review_logs(card_id);
CREATE INDEX card_review_logs_reviewed_at_index ON card_review_logs(reviewed_at);

-------------------------------------------------------------------------

-- History is kept even after the element is deleted, so the FK only clears
-- the reference rather than removing the log row. References meta(element_id)
-- since it is shared by readings and extracts.
CREATE TABLE reading_review_logs(
    id              TEXT        NOT NULL        PRIMARY KEY,
    element_id      TEXT,
    reviewed_at     TEXT        NOT NULL,
    action          TEXT        NOT NULL,
    FOREIGN KEY (element_id) REFERENCES meta(element_id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX reading_review_logs_element_id_index ON reading_review_logs(element_id);
CREATE INDEX reading_review_logs_reviewed_at_index ON reading_review_logs(reviewed_at);
