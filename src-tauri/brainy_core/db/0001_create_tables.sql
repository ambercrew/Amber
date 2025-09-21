-- Since there is a single client, we can allow read uncommitted.
PRAGMA read_uncommitted = TRUE;

CREATE TABLE folders(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    parent_id                   TEXT,
    FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE (name, parent_id)
);

-- The id of root is 00000000-0000-0000-0000-000000000001
INSERT INTO folders(id, name, parent_id) VALUES (X'00000000000000000000000000000001', 'root', NULL);

CREATE TABLE files(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    name                        TEXT        NOT NULL,
    parent_id                   TEXT        NOT NULL,
    FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    UNIQUE (name, parent_id)
);

CREATE TABLE cells(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    content                     TEXT        NOT NULL        DEFAULT "",
    cell_type                   TEXT        NOT NULL,
    cell_index                  INTEGER     NOT NULL,
    file_id                     TEXT        NOT NULL,
    searchable_content          TEXT        NOT NULL,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE cells_fts USING fts5(
    searchable_content, 
    content='cells',
    tokenize='trigram'
);

CREATE TRIGGER cells_ai AFTER INSERT ON cells
    BEGIN
        INSERT INTO cells_fts (rowid, searchable_content)
        VALUES (new.rowid, new.searchable_content);
    END;

CREATE TRIGGER cells_ad AFTER DELETE ON cells
    BEGIN
        INSERT INTO cells_fts (cells_fts, rowid, searchable_content)
        VALUES ('delete', old.rowid, old.searchable_content);
    END;

CREATE TRIGGER cells_au AFTER UPDATE ON cells
    BEGIN
        INSERT INTO cells_fts (cells_fts, rowid, searchable_content)
        VALUES ('delete', old.rowid, old.searchable_content);
        INSERT INTO cells_fts (rowid, searchable_content)
        VALUES (new.rowid, new.searchable_content);
    END;

CREATE TABLE repetitions(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    file_id                     TEXT        NOT NULL,
    cell_id                     TEXT        NOT NULL,
    due                         DATETIME    NOT NULL,
    stability                   REAL        NOT NULL,
    difficulty                  REAL        NOT NULL,
    elapsed_days                INTEGER     NOT NULL,
    scheduled_days              INTEGER     NOT NULL,
    reps                        INTEGER     NOT NULL,
    lapses                      INTEGER     NOT NULL,
    state                       TEXT        NOT NULL,
    last_review                 DATETIME,
    additional_content          TEXT,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY(cell_id) REFERENCES cells(id) ON DELETE CASCADE
);

CREATE INDEX repetitions_cell_id_index ON repetitions(cell_id);
CREATE INDEX repetitions_file_id_index ON repetitions(file_id);

CREATE TABLE reviews(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    cell_id                     TEXT,
    study_time                  INTEGER     NOT NULL,
    date                        DATETIME    NOT NULL,
    rating                      TEXT        NOT NULL,
    FOREIGN KEY(cell_id) REFERENCES cells(id) ON DELETE SET NULL
);
