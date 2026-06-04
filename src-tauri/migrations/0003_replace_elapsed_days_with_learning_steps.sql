ALTER TABLE repetitions ADD COLUMN learning_steps INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repetitions DROP COLUMN elapsed_days;
