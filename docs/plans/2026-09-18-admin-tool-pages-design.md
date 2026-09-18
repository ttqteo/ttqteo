# Calendar, Task, Ghi nhanh: trang riêng

Date: 2026-09-18

## Goal

Panel 360px đủ để liếc, không đủ để làm việc lâu: lịch chỉ có chấm và agenda một ngày, note phải rời danh sách mới sửa được. Ba công cụ của side panel có thêm trang riêng, rộng, dùng chung dữ liệu với panel.

## Decisions

| Câu hỏi | Quyết định |
|---|---|
| Đường dẫn | `/admin/calendar`, `/admin/tasks`, `/admin/quick-notes` (`/admin/notes` đã là ghi chú riêng trong bài) |
| Vào từ đâu | Toolbar có thêm ba link `calendar`, `task`, `ghi nhanh`, chỉ từ md trở lên (điện thoại đã có sheet, và toolbar 390px không còn chỗ). Header của panel có nút mở rộng, bấm thì đóng panel và sang trang |
| Icon `notes` trên toolbar | Đổi sang con mắt gạch, đúng icon hộp ghi chú riêng đang mang, để sticky note chỉ còn nghĩa Ghi nhanh như trên rail |
| Dữ liệu | `SidePanelProvider` bọc luôn `children` của admin layout, nên trang dùng `useSidePanel()` và cùng store với panel. Store note bật thêm khi pathname là trang Ghi nhanh |
| Calendar | Lưới tháng bắt đầu thứ Hai, 5 hoặc 6 hàng. Mỗi ô ghi tối đa 3 dòng: sự kiện cả ngày, task tới hạn, sự kiện có giờ (giờ bắt đầu, tiêu đề), dư thì "+n". Ngày 1 ghi kèm tháng. Bấm ô là chọn ngày; agenda ngày đó nằm cột phải (dưới lg thì nằm dưới lưới). Agenda tách ra `day-agenda.tsx`, panel và trang dùng chung |
| Task | Đúng `TasksPanel` trong cột `max-w-2xl`, thêm tiêu đề và số việc |
| Ghi nhanh | Hai cột từ lg: trái là ô ghi, tìm, và lưới thẻ 2 hoặc 3 cột; phải là editor của note đang chọn, sticky và tự cuộn. Dưới lg editor thay chỗ danh sách như panel. `NoteCard`, `NoteEditor`, `CaptureBox` và hook rời note (`useSaveOnLeave`) export từ `notes-panel.tsx` |
| Quyền | Như `/admin/notes`: server kiểm `getUser` và `isAdmin`, sai thì `redirect("/admin")` |

## Files

| File | Việc |
|---|---|
| `lib/calendar-events.ts` | Thêm `monthGridDays`, `monthLabel`, `shiftMonth` |
| `components/admin/side-panel/panels.ts` | Mỗi panel có `href` |
| `components/admin/side-panel/admin-side-panel.tsx`, `app/admin/layout.tsx` | Provider bọc trang |
| `components/admin/side-panel/side-panel-provider.tsx` | Store note bật theo pathname |
| `components/admin/side-panel/side-panel-frame.tsx` | Nút mở rộng |
| `components/admin/side-panel/day-agenda.tsx` | Mới: agenda một ngày, tách từ `calendar-panel.tsx` |
| `components/admin/side-panel/notes-panel.tsx` | Export thẻ, editor, ô ghi, hook rời note |
| `components/admin-toolbar.tsx` | Ba link mới, icon `notes` |
| `app/admin/calendar/`, `app/admin/tasks/`, `app/admin/quick-notes/` | Mới: page, client, loading |

## Testing

Vitest cho ba hàm mới trong `calendar-events` (lưới 5 và 6 hàng, qua năm). UI không test, như các thiết kế trước.

## Không làm

- Tạo hay kéo sự kiện trên lưới: lịch vẫn chỉ đọc, thêm sự kiện qua form của Google.
- Tuần, ngày: chỉ có tháng.
- Kéo thả note, màu note.
