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

CREATE TABLE folders(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    name                        TEXT        NOT NULL,
    parent_id                   TEXT,
    fsrs_profile_id             TEXT,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fsrs_profile_id) REFERENCES fsrs_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX folders_modified_date_index ON folders(modified_date);
CREATE INDEX folders_parent_id ON folders(parent_id);

-- The id of root is 00000000-0000-0000-0000-000000000001
INSERT INTO folders(
    id,
    name,
    parent_id,
    fsrs_profile_id) VALUES (
    X'00000000000000000000000000000001', 
    'root',
    NULL,
    X'00000000000000000000000000000002'
);

-------------------------------------------------------------------------

CREATE TABLE files(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    name                        TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    fsrs_profile_id             TEXT,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (fsrs_profile_id) REFERENCES fsrs_profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX files_modified_date_index ON files(modified_date);
CREATE INDEX files_parent_id ON files(parent_id);

-------------------------------------------------------------------------

CREATE TABLE cells(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    content                     TEXT        NOT NULL        DEFAULT "",
    cell_type                   TEXT        NOT NULL,
    cell_index                  INTEGER     NOT NULL,
    file_id                     TEXT        NOT NULL,
    searchable_content          TEXT        NOT NULL,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX cells_file_id ON cells(file_id);
CREATE INDEX cells_modified_date_index ON cells(modified_date);

CREATE VIRTUAL TABLE cells_fts USING fts5(
    searchable_content, 
    content='cells',
    tokenize='trigram'
);

CREATE TRIGGER cells_update_fts_table_after_insert 
    AFTER INSERT ON cells
BEGIN
    INSERT INTO cells_fts (rowid, searchable_content)
    VALUES (NEW.rowid, NEW.searchable_content);
END;

CREATE TRIGGER cells_update_fts_table_after_delete 
    AFTER DELETE ON cells
BEGIN
    INSERT INTO cells_fts (cells_fts, rowid, searchable_content)
    VALUES ('delete', OLD.rowid, OLD.searchable_content);
END;

CREATE TRIGGER cells_update_fts_table_after_update
    AFTER UPDATE ON cells
    WHEN OLD.searchable_content != NEW.searchable_content
BEGIN
    INSERT INTO cells_fts (cells_fts, rowid, searchable_content)
    VALUES ('delete', OLD.rowid, OLD.searchable_content);
    INSERT INTO cells_fts (rowid, searchable_content)
    VALUES (NEW.rowid, NEW.searchable_content);
END;

-------------------------------------------------------------------------

CREATE TABLE repetitions(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    file_id                     TEXT        NOT NULL,
    cell_id                     TEXT        NOT NULL,
    due                         TEXT        NOT NULL,
    stability                   REAL        NOT NULL,
    difficulty                  REAL        NOT NULL,
    elapsed_days                INTEGER     NOT NULL,
    scheduled_days              INTEGER     NOT NULL,
    reps                        INTEGER     NOT NULL,
    lapses                      INTEGER     NOT NULL,
    state                       TEXT        NOT NULL,
    last_review                 TEXT    ,
    additional_content          TEXT,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX repetitions_cell_id_index ON repetitions(cell_id);
CREATE INDEX repetitions_file_id_index ON repetitions(file_id);
CREATE INDEX repetitions_modified_date_index ON repetitions(modified_date);

-------------------------------------------------------------------------

CREATE TABLE reviews(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    created_date                TEXT        NOT NULL        DEFAULT (datetime('now')),
    modified_date               TEXT        NOT NULL        DEFAULT (datetime('now')),
    cell_id                     TEXT,
    study_time                  INTEGER     NOT NULL,
    date                        TEXT        NOT NULL,
    rating                      TEXT        NOT NULL,
    FOREIGN KEY (cell_id) REFERENCES cells(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX reviews_date ON reviews(date);
CREATE INDEX reviews_modified_date_index ON reviews(modified_date);

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
