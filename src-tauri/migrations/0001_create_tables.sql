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

CREATE TABLE ai_chats(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    title                       TEXT        NOT NULL
);

-------------------------------------------------------------------------

CREATE TABLE ai_messages(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    ai_chat_id                  TEXT        NOT NULL,
    content_type                TEXT        NOT NULL,
    content                     TEXT,
    FOREIGN KEY (ai_chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX ai_messages_ai_chat_id_index ON ai_messages(ai_chat_id);
