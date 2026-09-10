import { describe, expect, it } from "vitest";
import { extractPrivateNotes, stripPrivateNotes } from "@/lib/private-note";

const note = (inner: string) =>
  `<aside class="private-note" data-private-note="">${inner}</aside>`;

describe("stripPrivateNotes", () => {
  it("cắt ghi chú và giữ nguyên phần xung quanh", () => {
    expect(stripPrivateNotes(`<p>a</p>${note("<p>b</p>")}<p>c</p>`)).toBe(
      "<p>a</p><p>c</p>",
    );
  });

  it("cắt mọi ghi chú, không chỉ cái đầu tiên", () => {
    expect(stripPrivateNotes(`${note("<p>1</p>")}<p>a</p>${note("<p>2</p>")}`)).toBe(
      "<p>a</p>",
    );
  });

  it("cắt cả ghi chú lồng trong khối khác", () => {
    expect(
      stripPrivateNotes(`<div class="callout"><p>x</p>${note("<p>n</p>")}</div>`),
    ).toBe('<div class="callout"><p>x</p></div>');
  });

  it("nhận attribute không có giá trị", () => {
    expect(stripPrivateNotes("<p>a</p><aside data-private-note><p>b</p></aside>")).toBe(
      "<p>a</p>",
    );
  });

  it("không đụng tới aside thường", () => {
    const html = "<aside><p>x</p></aside><p>y</p>";
    expect(stripPrivateNotes(html)).toBe(html);
  });

  it("không nhận nhầm attribute trùng tiền tố", () => {
    const html = '<aside data-private-notes=""><p>x</p></aside>';
    expect(stripPrivateNotes(html)).toBe(html);
  });

  it("đếm đúng aside lồng bên trong ghi chú", () => {
    expect(
      stripPrivateNotes(`${note("<aside><p>x</p></aside><p>y</p>")}<p>z</p>`),
    ).toBe("<p>z</p>");
  });

  it("không nhầm chữ aside đã escape trong khối code", () => {
    const html = '<pre><code>&lt;aside data-private-note=""&gt;</code></pre><p>a</p>';
    expect(stripPrivateNotes(html)).toBe(html);
  });

  it("ghi chú không đóng thì bỏ luôn phần sau thay vì để lọt", () => {
    // Lỡ cắt thừa một đoạn còn hơn để ghi chú lên trang công khai.
    expect(
      stripPrivateNotes('<p>a</p><aside data-private-note=""><p>b</p><p>c</p>'),
    ).toBe("<p>a</p>");
  });

  it("để nguyên bài không có ghi chú nào", () => {
    const html = "<h2>Tiêu đề</h2><p>a</p>";
    expect(stripPrivateNotes(html)).toBe(html);
  });
});

describe("extractPrivateNotes", () => {
  it("lấy phần ruột của từng ghi chú, theo thứ tự trong bài", () => {
    expect(
      extractPrivateNotes(`${note("<p>1</p>")}<p>a</p>${note("<ul><li>2</li></ul>")}`),
    ).toEqual(["<p>1</p>", "<ul><li>2</li></ul>"]);
  });

  it("lấy cả ghi chú lồng trong khối khác", () => {
    expect(
      extractPrivateNotes(`<div class="callout"><p>x</p>${note("<p>n</p>")}</div>`),
    ).toEqual(["<p>n</p>"]);
  });

  it("giữ nguyên aside lồng bên trong ghi chú", () => {
    expect(extractPrivateNotes(note("<aside><p>x</p></aside><p>y</p>"))).toEqual([
      "<aside><p>x</p></aside><p>y</p>",
    ]);
  });

  it("không có ghi chú thì trả mảng rỗng", () => {
    expect(extractPrivateNotes("<aside><p>x</p></aside><p>y</p>")).toEqual([]);
  });

  it("chữ data-private-note nằm trong nội dung thì không tính là ghi chú", () => {
    // Một bài viết về chính tính năng này sẽ khớp bộ lọc `ilike` của truy vấn.
    expect(extractPrivateNotes("<p>dùng data-private-note để đánh dấu</p>")).toEqual([]);
  });

  it("ghi chú không đóng thì lấy tới hết chuỗi", () => {
    // Trang này chỉ admin xem, nên hiện thừa còn hơn làm mất ghi chú.
    expect(
      extractPrivateNotes('<p>a</p><aside data-private-note=""><p>b</p><p>c</p>'),
    ).toEqual(["<p>b</p><p>c</p>"]);
  });
});
