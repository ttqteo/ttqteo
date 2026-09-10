-- Chi admin moi duoc ghi vao blogs va doc bai nhap.
--
-- Truoc file nay, blogs co hai policy qua rong:
--   "Authenticated users full access" (schema.sql): moi user da dang nhap deu
--     doc, sua, xoa duoc moi bai. Login la Google OAuth nen "da dang nhap" chi
--     can mot tai khoan Google. Phep kiem ADMIN_EMAIL chi chay trong code
--     Next.js; goi thang Supabase bang token cua minh la di vong qua no.
--   "Allow public all access" (fix_permissions.sql, ghi la TEMPORARY): ai cung
--     lam duoc moi thu, ke ca chua dang nhap.
--
-- Admin duoc danh dau bang app_metadata.admin trong token, khong bang email:
-- user tu sua duoc user_metadata cua minh nhung khong sua duoc app_metadata,
-- va email khong phai nam trong mot file cua repo.
--
-- TRUOC KHI CHAY FILE NAY, chay mot lan (thay email bang ADMIN_EMAIL):
--
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"admin": true}'::jsonb
--   where email = '<ADMIN_EMAIL>';
--
-- roi dang xuat va dang nhap lai. Claim chi vao token o lan cap token sau; con
-- dung token cu thi moi lan luu bai se bi RLS tu choi cho toi khi token tu lam
-- moi (toi da mot gio).
--
-- Chay lai file nay bao nhieu lan cung duoc.

begin;

-- Go policy ma chua ai mang co admin thi chinh ban cung bi khoa ngoai.
do $$
begin
  if not exists (
    select 1 from auth.users where raw_app_meta_data ->> 'admin' = 'true'
  ) then
    raise exception 'Chua user nao co app_metadata.admin = true. Chay cau update o dau file truoc.';
  end if;
end $$;

drop policy if exists "Allow public all access" on public.blogs;
drop policy if exists "Authenticated users full access" on public.blogs;
drop policy if exists "Admin full access" on public.blogs;

-- "Public can read published blogs" giu nguyen: nguoi doc van doc duoc bai da
-- dang. increment_views / increment_likes la security definer nen khong policy
-- nao chan chung.
create policy "Admin full access"
on public.blogs
for all
to authenticated
using ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true')
with check ((auth.jwt() -> 'app_metadata' ->> 'admin') = 'true');

commit;

-- Kiem lai: phai con dung hai policy, "Public can read published blogs" va
-- "Admin full access".
--
--   select policyname, cmd, roles from pg_policies where tablename = 'blogs';
