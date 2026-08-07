ALTER TABLE readings RENAME TO learning_assets;
ALTER TABLE reading_splits RENAME TO learning_asset_splits;
ALTER TABLE learning_asset_splits RENAME COLUMN reading_id TO learning_asset_id;
ALTER TABLE reading_reviews RENAME TO learning_asset_reviews;
ALTER TABLE reading_review_logs RENAME TO learning_asset_review_logs;

-------------------------------------------------------------------------

-- Triggers keep their old names and definitions after the table renames above
-- (SQLite updates the bodies automatically but not the trigger names), so
-- they are dropped and recreated here under names that match the new tables.

DROP TRIGGER readings_add_to_deleted_entities_after_delete;

CREATE TRIGGER learning_assets_add_to_deleted_entities_after_delete
    AFTER DELETE ON learning_assets
BEGIN
    INSERT INTO deleted_entities (entity_name, entity_id, entity_created_at, deleted_date)
    SELECT 'learning_assets', OLD.id, created_at, datetime('now')
    FROM meta WHERE element_id = OLD.id;
END;

DROP TRIGGER readings_delete_meta_after_delete;

CREATE TRIGGER learning_assets_delete_meta_after_delete
    AFTER DELETE ON learning_assets
BEGIN
    DELETE FROM meta WHERE element_id = OLD.id;
END;

DROP TRIGGER reading_reviews_update_meta_modified_at_after_update;

-- Keep the element's meta modified_at in sync whenever its review state changes.
CREATE TRIGGER learning_asset_reviews_update_meta_modified_at_after_update
    AFTER UPDATE ON learning_asset_reviews
BEGIN
    UPDATE meta
    SET modified_at = datetime('now')
    WHERE element_id = NEW.element_id;
END;

-------------------------------------------------------------------------

-- Indexes are likewise dropped and recreated under names matching the new table.

DROP INDEX reading_review_logs_element_id_index;
DROP INDEX reading_review_logs_reviewed_at_index;

CREATE INDEX learning_asset_review_logs_element_id_index ON learning_asset_review_logs(element_id);
CREATE INDEX learning_asset_review_logs_reviewed_at_index ON learning_asset_review_logs(reviewed_at);
