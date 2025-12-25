-- Final fix for views and likes increment functions
-- Run this in Supabase SQL Editor

-- Drop old functions
DROP FUNCTION IF EXISTS increment_views(text);
DROP FUNCTION IF EXISTS increment_likes(text);

-- Create increment_views (returns affected rows count)
CREATE OR REPLACE FUNCTION increment_views(blog_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.blogs 
  SET views = COALESCE(views, 0) + 1, 
      updated_at = NOW()
  WHERE slug = blog_slug;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- Create increment_likes (returns affected rows count)
CREATE OR REPLACE FUNCTION increment_likes(blog_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.blogs 
  SET likes = COALESCE(likes, 0) + 1, 
      updated_at = NOW()
  WHERE slug = blog_slug;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_views(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_views(text) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_likes(text) TO anon;
GRANT EXECUTE ON FUNCTION increment_likes(text) TO authenticated;
