-- Hai bang cho sidebar ben phai cua admin: ghi nhanh (admin_notes) va task
-- (admin_tasks). Xem docs/plans/2026-09-11-admin-side-panel-design.md.
--
-- Chi admin doc va ghi duoc, cung dieu kien voi blogs trong
-- restrict_blogs_to_admin.sql. Chay file do truoc: no dat app_metadata.admin
-- cho tai khoan cua ban, thieu no thi chinh ban cung bi RLS chan.
--
-- id do trinh duyet tao (crypto.randomUUID) de tu luu va Undo cung la mot
-- lenh upsert; default o day chi de insert tay trong SQL editor van chay.
--
-- Chay lai bao nhieu lan cung duoc.

begin;

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_notes enable row level security;
alter table public.admin_tasks enable row level security;

drop policy if exists "Admin full access" on public.admin_notes;
create policy "Admin full access"
on public.admin_notes
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true')
with check ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true');

drop policy if exists "Admin full access" on public.admin_tasks;
create policy "Admin full access"
on public.admin_tasks
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true')
with check ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true');

commit;

-- PostgREST phai biet hai bang moi thi API moi thay chung.
notify pgrst, 'reload schema';

-- Kiem lai: moi bang dung mot policy "Admin full access".
--
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('admin_notes', 'admin_tasks');
