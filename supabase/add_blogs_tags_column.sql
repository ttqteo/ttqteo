-- Add tags column to blogs.
-- Stored as a comma-separated text string to mirror the MDX frontmatter shape
-- ("sưu tầm, ai, tech"). Keep it as TEXT (not TEXT[]) so editor input stays
-- a single textarea/input and rendering logic is shared between MDX and DB posts.

ALTER TABLE blogs
  ADD COLUMN IF NOT EXISTS tags text NOT NULL DEFAULT '';
