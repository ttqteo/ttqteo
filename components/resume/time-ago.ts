export function timeAgo(updatedAt: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - updatedAt);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} ngày trước`;
  const mo = Math.floor(day / 30);
  return `${mo} tháng trước`;
}
