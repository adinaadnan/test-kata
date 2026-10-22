ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS assignee_id integer REFERENCES users(id);
