-- TEMPORARY: Allow public insert/update/delete for migration
create policy "Allow public all access"
on public.blogs
for all
to public
using (true)
with check (true);
