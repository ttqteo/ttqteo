-- Unified blogs table (content + views/likes)

-- Create unified blogs table
create table if not exists public.blogs (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  title text not null,
  description text,
  content text, -- HTML content
  cover text,
  is_published boolean default false,
  views integer default 0,
  likes integer default 0,
  author_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deleted_at timestamp with time zone default null
);

-- Enable RLS
alter table public.blogs enable row level security;

-- Public can read published blogs
create policy "Public can read published blogs"
on public.blogs for select
to public
using (is_published = true);

-- Authenticated users can do everything
create policy "Authenticated users full access"
on public.blogs for all
to authenticated
using (true)
with check (true);

-- Function to increment views atomically
create or replace function increment_views(blog_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.blogs set views = views + 1 where slug = blog_slug;
end;
$$;

-- Function to increment likes atomically
create or replace function increment_likes(blog_slug text)
returns void
language plpgsql
security definer
as $$
begin
  update public.blogs set likes = likes + 1 where slug = blog_slug;
end;
$$;
