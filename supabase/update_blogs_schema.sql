-- Add deleted_at column for soft delete
alter table public.blogs 
add column if not exists deleted_at timestamp with time zone default null;

-- Change content type from jsonb to text (since we are now storing HTML string)
alter table public.blogs 
alter column content type text using content::text;
