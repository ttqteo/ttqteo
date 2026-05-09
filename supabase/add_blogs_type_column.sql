-- Add type column to blogs to support /lab content surfaces
-- (post: writing, note/reading/paper: lab content)

ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'post'
  CHECK (type IN ('post', 'note', 'reading', 'paper'));

CREATE INDEX IF NOT EXISTS blogs_type_idx
  ON blogs(type)
  WHERE deleted_at IS NULL;
