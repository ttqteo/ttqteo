-- Hai bang cho sidebar ben phai cua admin: ghi nhanh (admin_notes) va task
-- (admin_tasks). Xem docs/plans/2026-09-11-admin-side-panel-design.md.
--
-- Chi admin doc va ghi duoc, cung dieu kien voi blogs trong
-- restrict_blogs_to_admin.sql. Tai khoan cua ban phai co app_metadata.admin
-- truoc: chay cau update o dau file do mot lan, roi dang xuat va dang nhap lai.
-- Chua ai co thi file nay dung lai o buoc kiem ben duoi.
--
-- id do trinh duyet tao (crypto.randomUUID) de tu luu va Undo cung la mot
-- lenh upsert; default o day chi de insert tay trong SQL editor van chay.
--
-- Chay lai bao nhieu lan cung duoc.

begin;

-- Tao bang xong ma khong ai doc duoc thi panel chi hien danh sach rong, rat
-- kho doan ra vi sao. Nen dung lai ngay tu day.
do $$
begin
  if not exists (
    select 1 from auth.users where raw_app_meta_data ->> 'admin' = 'true'
  ) then
    raise exception 'Chua user nao co app_metadata.admin = true. Chay cau update o dau restrict_blogs_to_admin.sql truoc.';
  end if;
end $$;

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

-- Chi authenticated dung duoc hai bang, va chi bon lenh ma API can; RLS o tren
-- quyet dinh ai trong so do. anon khong co gi, ke ca xem cot trong OpenAPI.
revoke all on public.admin_notes, public.admin_tasks from anon;
revoke all on public.admin_notes, public.admin_tasks from authenticated;
grant select, insert, update, delete on public.admin_notes, public.admin_tasks to authenticated;

commit;

-- PostgREST phai biet hai bang moi thi API moi thay chung.
notify pgrst, 'reload schema';

-- Kiem lai: moi bang dung mot policy "Admin full access", va RLS dang bat (t).
--
--   select tablename, policyname, cmd from pg_policies
--   where tablename in ('admin_notes', 'admin_tasks');
--
--   select relname, relrowsecurity from pg_class
--   where oid in ('public.admin_notes'::regclass, 'public.admin_tasks'::regclass);
