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

CREATE TABLE concepts(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    title                       TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT
);

CREATE TABLE concept_parents(
    concept_id                  TEXT        NOT NULL,
    parent_concept_id           TEXT        NOT NULL,
    PRIMARY KEY (concept_id, parent_concept_id),
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (parent_concept_id) REFERENCES concepts(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX concept_parents_concept_id_index ON concept_parents(concept_id);
CREATE INDEX concept_parents_parent_concept_id_index ON concept_parents(parent_concept_id);

-------------------------------------------------------------------------

CREATE TABLE readings(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    title                       TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    source_type                 TEXT        NOT NULL,
    source_url                  TEXT,
    body                        TEXT        NOT NULL
);

CREATE TABLE reading_concepts(
    reading_id                  TEXT        NOT NULL,
    concept_id                  TEXT        NOT NULL,
    PRIMARY KEY (reading_id, concept_id),
    FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX reading_concepts_reading_id_index ON reading_concepts(reading_id);
CREATE INDEX reading_concepts_concept_id_index ON reading_concepts(concept_id);

-------------------------------------------------------------------------

CREATE TABLE extracts(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    title                       TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    parent_type                 TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    text                        TEXT        NOT NULL
);

CREATE TABLE extract_concepts(
    extract_id                  TEXT        NOT NULL,
    concept_id                  TEXT        NOT NULL,
    PRIMARY KEY (extract_id, concept_id),
    FOREIGN KEY (extract_id) REFERENCES extracts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX extract_concepts_extract_id_index ON extract_concepts(extract_id);
CREATE INDEX extract_concepts_concept_id_index ON extract_concepts(concept_id);

-------------------------------------------------------------------------

CREATE TABLE cards(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    title                       TEXT        NOT NULL,
    position                    INTEGER     NOT NULL        DEFAULT 0,
    created_at                  TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_at                 TEXT        NOT NULL        DEFAULT (datetime('now')),
    removed_at                  TEXT,
    parent_type                 TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    front                       TEXT        NOT NULL,
    back                        TEXT        NOT NULL
);

CREATE TABLE card_concepts(
    card_id                     TEXT        NOT NULL,
    concept_id                  TEXT        NOT NULL,
    PRIMARY KEY (card_id, concept_id),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX card_concepts_card_id_index ON card_concepts(card_id);
CREATE INDEX card_concepts_concept_id_index ON card_concepts(concept_id);
