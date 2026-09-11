# Admin Side Panel: Design

Date: 2026-09-11

## Goal

Một sidebar bên phải cho khu admin, giống sidebar của Microsoft Edge và thanh bên của Google Calendar: một rail icon hẹp, bấm vào thì mở một panel. Ba công cụ:

- **Calendar**: xem lịch Google (chỉ đọc) và task có hạn, ngay trong admin.
- **Task**: danh sách việc cần làm, có hạn theo ngày.
- **Ghi nhanh**: note text thuần kiểu Google Keep.

Mục đích là vừa viết bài hay quản lý bài vừa liếc được lịch, việc và ghi chú, không phải chuyển tab.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Nguồn dữ liệu | Note và task lưu ở Supabase. Lịch Google đọc qua link iCal bí mật, chỉ đọc |
| Sync hai chiều với Google | Không làm ở v1 (lý do ở mục Không làm) |
| Tạo sự kiện | Nút "+ Sự kiện" mở form tạo sự kiện của Google, điền sẵn ngày đang chọn |
| Phạm vi | Chỉ trong `/admin` (danh sách bài, `/admin/notes`, editor) |
| Rail | Luôn đẩy nội dung |
| Panel | Đẩy nội dung từ 1280px trở lên, dưới đó nổi đè lên |
| Điện thoại (< 768px) | Không có rail. Một icon trên toolbar mở sheet toàn màn với ba tab |
| Quick note | Danh sách note kiểu Keep, text thuần, không có màu |
| Hạn của task | Theo ngày, không có giờ |
| Cấu hình lịch | Biến môi trường `ADMIN_CALENDAR_FEEDS`, không có màn hình cấu hình |
| Tên panel note | "Ghi nhanh", để khỏi lẫn với mục "notes" (ghi chú riêng trong bài) đang có trên toolbar |

## Khung

```
┌──────────────────── admin toolbar (36px, fixed) ─────────────────────┐
├──────────────────────────────────────────┬──────────────┬────────────┤
│                                          │ panel 360px  │ rail 48px  │
│   nội dung /admin                        │              │  [lịch]    │
│   (bị đẩy khi >= 1280px,                 │              │  [task] 3  │
│    bị đè khi nhỏ hơn)                    │              │  [note]    │
└──────────────────────────────────────────┴──────────────┴────────────┘
```

- Rail rộng 48px, `fixed` cạnh phải, từ `top: 36px` xuống đáy. Icon Task có badge đếm số task quá hạn cộng số task hôm nay. Tooltip hiện tên và phím tắt.
- Panel rộng 360px, nằm ngay bên trái rail, nội dung cuộn riêng. Bấm icon đang mở thì đóng, bấm icon khác thì đổi panel.
- Nội dung bị đẩy bằng `padding-right` trên `.app-shell`, cùng cách toolbar đang đẩy `padding-top`. Độ rộng đang chiếm nằm trong biến CSS `--admin-side-w` (48px, hoặc 408px khi panel mở và màn đủ rộng), để các phần tử `fixed` dùng chung.
- Panel đang mở được lưu trong localStorage. Script trong `<head>` của `app/layout.tsx` (đang set `is-admin` và `tocExpanded`) set thêm `data-admin-panel` lên `<html>`. CSS đẩy nội dung nằm trong `<style>` của `app/admin/layout.tsx`, nên thuộc tính này không ảnh hưởng gì ngoài `/admin`, và F5 không bị giật.
- Mỗi tab giữ panel đang mở của riêng nó, như sidebar của Edge. Lúc provider đọc lần đầu, giá trị lấy từ dấu mà script `<head>` đã đặt lên `<html>` khi tải trang, nên panel và khoảng chừa luôn khớp nhau, kể cả khi vào `/admin` bằng điều hướng client lâu sau đó. localStorage chỉ được script `<head>` đọc, ở lần tải trang sau.
- Rail ẩn hiện theo `html.is-admin`, giống toolbar.
- Luật CSS chừa chỗ khoá theo `:has(.admin-side-rail)` chứ không dựa vào việc style của admin layout bị gỡ khi rời `/admin`. Rail rời DOM thì chỗ chừa cũng mất, kể cả khi style hoist vẫn còn trong `<head>`.
- Toolbar nằm ở root layout, ngoài provider, nên nút mở sheet trên điện thoại gửi một window event (`OPEN_ADMIN_SHEET_EVENT`) để provider nghe.
- Phím tắt: Alt+1, Alt+2, Alt+3 mở Calendar, Task, Ghi nhanh, bấm lại thì đóng. Esc đóng panel khi con trỏ đang ở trong panel. Không trùng với phím của editor (Ctrl+Alt+N, Ctrl+Alt+C, Ctrl+Shift+C) hay các phím `g` + chữ trong `lib/keyboard-nav.tsx`.

### Các phần tử fixed phải chừa chỗ cho rail

| Phần tử | Hiện tại | Sửa thành |
|---|---|---|
| Khung split của editor | `fixed inset-0` | chừa cạnh phải `--admin-side-w` |
| Cụm nút góc dưới phải của editor | `right-4`, hoặc `right-[calc(45%+1rem)]` khi mở bảng vẽ | cộng thêm `--admin-side-w` |
| Toaster (`bottom-right`) | cách mép phải mặc định | dời vào bằng CSS trong admin layout |
| Thanh bulk action trong bảng bài | `sticky` | không cần sửa, tự chạy theo padding |

## Ba panel

### Calendar

- Trên cùng là lịch tháng nhỏ (`components/ui/calendar.tsx`). Ngày có sự kiện hoặc task thì có chấm dưới số ngày.
- Bên dưới là agenda của ngày đang chọn: sự kiện cả ngày nằm trên, rồi tới sự kiện có giờ. Mỗi dòng có vạch màu theo lịch, khung giờ, tiêu đề, địa điểm. Xem hôm nay thì có vạch đỏ ở giờ hiện tại. Bấm vào sự kiện thì mở rộng ra xem mô tả.
- Sự kiện kéo qua nhiều ngày thì hiện ở mọi ngày nó chạm tới.
- Task tới hạn ngày đó hiện trong agenda, có checkbox để tick xong.
- Header có "Hôm nay", ‹ › để lùi tiến từng ngày, và nút ↻ để tải lại lịch, bỏ qua cache.
- Nút "+ Sự kiện" mở `calendar.google.com/calendar/render?action=TEMPLATE&dates=…` trong tab mới.

### Task

- Ô "Thêm task…" nằm trên cùng, Enter là thêm. Nút chọn hạn có lựa chọn nhanh Hôm nay / Ngày mai / Tuần sau, hoặc tự chọn ngày.
- Nhóm: **Quá hạn** (chữ đỏ), **Hôm nay**, **Sắp tới**, **Không hạn**. Nhóm **Đã xong** gập lại ở cuối, chỉ hiện task xong trong 7 ngày gần nhất.
- Trong mỗi nhóm, xếp theo hạn rồi theo ngày tạo. Không có kéo thả.
- Tick là xong ngay trên giao diện, kèm toast có Undo. Bấm vào tiêu đề để sửa tại chỗ. Rê chuột vào thì hiện nút đổi hạn và nút xoá.

### Ghi nhanh

- Ô "Ghi gì đó…" nằm trên cùng. Mở panel là con trỏ đã nằm sẵn trong ô này, gõ xong là thành một note mới.
- Danh sách thẻ note: dòng đầu không trống in đậm làm tiêu đề, kèm 3 dòng xem trước. Note ghim lên đầu, còn lại xếp theo lần sửa gần nhất.
- Nút kính lúp trên header để tìm, không phân biệt hoa thường và không phân biệt dấu ("tet" tìm ra "Tết").
- Bấm vào thẻ thì mở chế độ sửa trong panel: textarea tự giãn theo nội dung, nút quay lại, ghim, xoá. Tự lưu sau khi ngừng gõ 500ms. Chấm trạng thái giống editor: vàng là chưa lưu, xanh là đã lưu, đỏ là lỗi.
- Note trống tự bị xoá khi rời khỏi nó. Xoá note thì có toast Undo.
- Chân panel có link "Ghi chú riêng trong bài →" sang `/admin/notes`.

## Dữ liệu

`supabase/add_admin_side_panel.sql`, chạy lại bao nhiêu lần cũng được:

```sql
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
```

Mỗi bảng bật RLS và có đúng một policy "Admin full access", cùng điều kiện với `blogs` trong `restrict_blogs_to_admin.sql`: `(auth.jwt() -> 'app_metadata' ->> 'admin') = 'true'`. Không có policy đọc công khai.

## API

Theo kiểu của `app/api/posts/[id]/route.ts`: chặn bằng `getUser()` và `isAdmin()`, rồi dùng `createSupabaseServerClient()` mang token của người gọi, nên RLS là lớp chặn thứ hai.

| Route | Việc |
|---|---|
| `GET /api/admin/notes` | Mọi note |
| `PUT /api/admin/notes/[id]` | Tạo hoặc thay note (upsert) với `{ body, pinned, created_at? }` |
| `DELETE /api/admin/notes/[id]` | Xoá thật |
| `GET /api/admin/tasks` | Task chưa xong, cộng task xong trong 7 ngày |
| `PUT /api/admin/tasks/[id]` | Tạo hoặc thay task (upsert) với `{ title, due_on, done_at, created_at? }` |
| `DELETE /api/admin/tasks/[id]` | Xoá thật |
| `GET /api/admin/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD[&fresh=1]` | Sự kiện đã trải ra trong khoảng ngày |

`id` do trình duyệt tạo (`crypto.randomUUID()`), nên tạo mới, tự lưu, tick xong và Undo sau khi xoá đều là cùng một lệnh `PUT`. Client luôn gửi cả bản ghi, không gửi body một phần. Server tự đặt `updated_at`. Mỗi note chỉ có một request đang chạy tại một thời điểm, nên một lần lưu chậm không thể đè lên lần lưu mới hơn, hay tạo lại note vừa xoá.

## Nguồn lịch Google

```
ADMIN_CALENDAR_FEEDS=[{"name":"MIT","color":"#16a34a","url":"https://calendar.google.com/calendar/ical/.../basic.ics"}]
```

- Chỉ dùng ở server, không bao giờ có tiền tố `NEXT_PUBLIC_`. Link bí mật cho phép đọc toàn bộ lịch.
- Lịch riêng dùng "Secret address in iCal format" (Google Calendar → Settings → chọn lịch → Integrate calendar). Lịch công khai dùng địa chỉ public.
- Màu lấy từ cấu hình, vì file ICS của Google không mang theo màu của lịch.

`lib/calendar-feed.ts` gồm các hàm thuần:

- `parseFeedsConfig(raw)`: đọc và kiểm tra biến môi trường. Sai cấu hình thì trả lỗi rõ ràng, không throw lên tới route.
- `expandFeed(icsText, range)`: dùng `ical.js` 2.x. Trải RRULE ra trong khoảng ngày, tính cả EXDATE và các buổi bị dời (RECURRENCE-ID), đổi VTIMEZONE sang thời điểm tuyệt đối. Sự kiện cả ngày giữ nguyên dạng ngày `YYYY-MM-DD` để không bị lệch ngày.

Route calendar:

1. Tải mọi feed song song, mỗi feed timeout 8 giây (`AbortSignal.timeout`), `cache: "no-store"`.
2. Trải từng feed, gộp lại, xếp theo giờ bắt đầu.
3. Trả về `{ events, failed }`, trong đó `failed` là tên các lịch tải hỏng. Một feed lỗi không làm hỏng cả request.

**Cache.** Fetch cache của Next không lưu được response lớn hơn 2MB, mà file ICS của một lịch công việc dùng nhiều năm dễ vượt mức đó. Vì vậy cache kết quả đã trải, theo từng khoảng ngày, bằng `unstable_cache` với revalidate 300 giây và tag `admin-calendar`. `fresh=1` gọi `revalidateTag("admin-calendar", { expire: 0 })` trước khi đọc. (`"use cache"` cần bật `cacheComponents`, repo chưa bật.)

## Phía client

- `AdminSidePanelProvider` mount trong `app/admin/layout.tsx`, giữ: panel đang mở, kho task, kho note, và lịch đã tải theo từng tháng.
- Kho task dùng chung cho panel Task, agenda của Calendar và badge. Task được tải ngay khi vào admin. Note và lịch chỉ tải khi panel của chúng mở lần đầu.
- Layout admin giữ nguyên khi chuyển trang trong `/admin`, nên dữ liệu đã tải không phải tải lại.
- Mọi phép tính "hôm nay" chạy trên trình duyệt theo giờ máy. Server không tự quyết ngày nào là hôm nay.
- Không thêm thư viện nào ngoài `ical.js`.

## Xử lý lỗi

- Sửa note và task: giao diện đổi ngay trước khi server trả lời. Server lỗi thì trả về như cũ và báo bằng toast.
- Tự lưu note lỗi: chấm đỏ, chữ vẫn nằm nguyên, lần gõ sau lưu lại. Thẻ note giữ chấm đỏ cho tới khi lưu được.
- 401 hoặc 403: toast "Hết phiên đăng nhập" kèm link về `/admin`.
- Supabase báo bảng không tồn tại: panel ghi rõ cần chạy `supabase/add_admin_side_panel.sql`.
- Calendar: lịch tải hỏng hiện dòng "Không tải được: MIT". Thiếu hoặc sai `ADMIN_CALENDAR_FEEDS`: panel vẫn hiện task theo ngày, kèm hướng dẫn cấu hình.

## Files

| File | Việc |
|---|---|
| `supabase/add_admin_side_panel.sql` | Mới: hai bảng và RLS |
| `lib/admin-panel-prefs.ts` | Mới: panel đang mở (localStorage, đọc qua `useSyncExternalStore`), đoạn script cho `<head>` |
| `lib/date-key.ts` | Mới: ngày dạng `YYYY-MM-DD` theo giờ máy |
| `lib/admin-db.ts` | Mới: nhận ra lỗi thiếu bảng, kiểm uuid, đọc timestamp |
| `lib/admin-api.ts` | Mới: `requireAdmin`, `badRequest`, `dbError` cho các route |
| `lib/admin-fetch.ts` | Mới: fetch JSON cho panel, phân loại lỗi (hết phiên, thiếu bảng, mạng, server) |
| `lib/admin-notes.ts` | Mới: tiêu đề, xem trước, sắp xếp, tìm, kiểm body của `PUT` |
| `lib/admin-tasks.ts` | Mới: chia nhóm, số trên badge, hạn nhanh, nhãn hạn, kiểm body của `PUT` |
| `lib/calendar-events.ts` | Mới: kiểu sự kiện, lọc theo ngày, khoảng ngày của một tháng, nhãn |
| `lib/calendar-feed.ts` | Mới, chỉ server: đọc cấu hình, trải ICS bằng `ical.js` |
| `lib/google-calendar-link.ts` | Mới: link form tạo sự kiện của Google |
| `app/api/admin/notes/route.ts`, `app/api/admin/notes/[id]/route.ts` | Mới |
| `app/api/admin/tasks/route.ts`, `app/api/admin/tasks/[id]/route.ts` | Mới |
| `app/api/admin/calendar/route.ts` | Mới |
| `components/admin/side-panel/` | Mới: provider, rail, khung panel, sheet, ba panel, ba kho dữ liệu |
| `app/admin/layout.tsx` | Mount sidebar, CSS chừa chỗ |
| `app/layout.tsx` | Script `<head>` set thêm `data-admin-panel`, Toaster dời vào |
| `components/admin-toolbar.tsx` | Icon mở sheet trên điện thoại |
| `app/admin/edit/[id]/edit-post-client.tsx` | Khung split và cụm nút góc phải chừa `--admin-side-w` |
| `.env.example` | Thêm `ADMIN_CALENDAR_FEEDS` |
| `package.json` | Thêm `ical.js` |

## Testing

Vitest cho hàm thuần trong `lib/`. Phần UI không test, như các thiết kế trước.

- `calendar-feed`: sự kiện lặp hằng tuần, EXDATE, buổi bị dời, sự kiện cả ngày, sự kiện qua nửa đêm (22:30 tới 00:15 hiện ở cả hai ngày), múi giờ Asia/Ho_Chi_Minh, cấu hình sai hoặc thiếu field.
- `admin-tasks`: chia nhóm theo một "hôm nay" cố định, bỏ task xong quá 7 ngày, số trên badge bằng quá hạn cộng hôm nay.
- `admin-notes`: tiêu đề và xem trước từ dòng không trống đầu tiên, note ghim lên đầu, tìm không phân biệt hoa thường và dấu.
- `google-calendar-link`: link cho một ngày trọn vẹn, ngày kết thúc tính loại trừ.

## Thứ tự làm

Mỗi bước merge riêng, xong bước nào dùng được bước đó.

1. **Khung**: rail, panel rỗng, đẩy/đè, sheet trên điện thoại, nhớ panel đang mở, phím tắt, chừa chỗ cho các phần tử fixed.
2. **Ghi nhanh**: bảng, API, panel.
3. **Task**: bảng, API, panel, badge.
4. **Calendar**: `calendar-feed`, API, panel, agenda gộp sự kiện và task.

## Không làm

- **Sync hai chiều với Google Calendar và Google Tasks.** Lịch đang nằm trong tài khoản Workspace `mozox.com`; nếu tài khoản đăng nhập admin là tài khoản khác thì phải làm một luồng OAuth riêng và tự giữ refresh token. Scope calendar là scope nhạy cảm: app ở chế độ Testing thì refresh token hết hạn sau 7 ngày, còn chuyển sang Production thì gặp màn hình "unverified app". Admin Workspace còn có thể chặn app bên thứ ba. Đồng bộ hai chiều còn phải xử lý xung đột, xoá, và sự kiện lặp lại. Nên làm khi thấy mình tạo sự kiện từ admin thường xuyên, hoặc cần task của admin hiện lên điện thoại. Lúc đó chỉ cần thay nguồn trong `calendar-feed`, UI giữ nguyên.
- Google Keep: không có API cho tài khoản thường.
- Màu note, task có giờ, kéo thả sắp xếp, task gắn với bài viết, màn hình cấu hình lịch.

## Risks

- **Workspace có thể đã tắt link iCal bí mật.** Kiểm tra trước bước 4: Google Calendar → Settings → từng lịch → Integrate calendar, xem có "Secret address in iCal format" không. Không có thì lịch đó không đọc được theo cách này. Bước 1 tới 3 không phụ thuộc chuyện này.
- **Lộ link bí mật** thì ai cũng đọc được lịch. Bấm Reset cạnh link trong Google để đổi link mới, rồi cập nhật biến môi trường.
- **Lần đầu mở mỗi tháng có thể chậm**: file ICS vài MB mất khoảng nửa giây tới một giây để parse. Các lần sau lấy từ cache.
- **Khung split của editor** có sẵn một panel bảng vẽ ở bên phải. Khi mở cả panel admin lẫn bảng vẽ trên màn nhỏ hơn 1280px, panel admin nổi đè lên bảng vẽ. Chấp nhận được.
