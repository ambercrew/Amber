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

CREATE TABLE folders(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    parent_folder_id            TEXT,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    FOREIGN KEY (parent_folder_id) REFERENCES folders(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX folders_parent_folder_id_index ON folders(parent_folder_id);

-------------------------------------------------------------------------

CREATE TABLE tags(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT
);

CREATE TABLE tag_parents(
    tag_id                      TEXT        NOT NULL,
    parent_tag_id               TEXT        NOT NULL,
    PRIMARY KEY (tag_id, parent_tag_id),
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (parent_tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX tag_parents_tag_id_index ON tag_parents(tag_id);
CREATE INDEX tag_parents_parent_tag_id_index ON tag_parents(parent_tag_id);

CREATE TABLE folder_tags(
    folder_id                   TEXT        NOT NULL,
    tag_id                      TEXT        NOT NULL,
    PRIMARY KEY (folder_id, tag_id),
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX folder_tags_folder_id_index ON folder_tags(folder_id);
CREATE INDEX folder_tags_tag_id_index ON folder_tags(tag_id);

-------------------------------------------------------------------------

CREATE TABLE readings(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    folder_id                   TEXT        NOT NULL,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    source_type                 TEXT        NOT NULL,
    source_url                  TEXT,
    body                        TEXT        NOT NULL,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX readings_folder_id_index ON readings(folder_id);

CREATE TABLE reading_tags(
    reading_id                  TEXT        NOT NULL,
    tag_id                      TEXT        NOT NULL,
    PRIMARY KEY (reading_id, tag_id),
    FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX reading_tags_reading_id_index ON reading_tags(reading_id);
CREATE INDEX reading_tags_tag_id_index ON reading_tags(tag_id);

-------------------------------------------------------------------------

CREATE TABLE extracts(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    parent_type                 TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    text                        TEXT        NOT NULL
);

CREATE INDEX extracts_parent_id_index ON extracts(parent_id);

CREATE TABLE extract_tags(
    extract_id                  TEXT        NOT NULL,
    tag_id                      TEXT        NOT NULL,
    PRIMARY KEY (extract_id, tag_id),
    FOREIGN KEY (extract_id) REFERENCES extracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX extract_tags_extract_id_index ON extract_tags(extract_id);
CREATE INDEX extract_tags_tag_id_index ON extract_tags(tag_id);

-------------------------------------------------------------------------

CREATE TABLE cards(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    parent_type                 TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    front                       TEXT        NOT NULL,
    back                        TEXT        NOT NULL
);

CREATE INDEX cards_parent_id_index ON cards(parent_id);

CREATE TABLE card_tags(
    card_id                     TEXT        NOT NULL,
    tag_id                      TEXT        NOT NULL,
    PRIMARY KEY (card_id, tag_id),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX card_tags_card_id_index ON card_tags(card_id);
CREATE INDEX card_tags_tag_id_index ON card_tags(tag_id);
