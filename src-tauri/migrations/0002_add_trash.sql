ALTER TABLE meta ADD COLUMN trashed_at TEXT;

-- 1 for the element the user explicitly trashed, 0 for the descendants that
-- went with it.
ALTER TABLE meta ADD COLUMN trashed_root INTEGER NOT NULL DEFAULT 0;

DROP INDEX meta_parent_id_index;
DROP INDEX meta_bibliographical_source_id_index;
DROP INDEX meta_priority_index;

CREATE INDEX meta_parent_trashed_position_index ON meta(parent_id, trashed_at, position);
CREATE INDEX meta_bibliographical_source_trashed_index ON meta(bibliographical_source_id, trashed_at);
CREATE INDEX meta_trashed_priority_index ON meta(trashed_at, priority);
CREATE INDEX meta_trashed_root_trashed_at_index ON meta(trashed_root, trashed_at);
