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

-------------------------------------------------------------------------

CREATE TABLE ai_message_context_snippets(
    id                          TEXT        NOT NULL        PRIMARY KEY,
    ai_message_id               TEXT        NOT NULL,
    snippet                     TEXT        NOT NULL,
    position                    INTEGER     NOT NULL,
    FOREIGN KEY (ai_message_id) REFERENCES ai_messages(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX ai_message_context_snippets_ai_message_id_index ON ai_message_context_snippets(ai_message_id);
