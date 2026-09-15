import Image from "@tiptap/extension-image";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import {
  ImageUpload,
  imageFilesFrom,
  insertImages,
  startImageUpload,
} from "./image-upload";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function open(content: string): Editor {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: [StarterKit, Image, ImageUpload],
    content,
  });
  return editor;
}

const SRC = "https://cdn.dev/a.png";
const IMG = `<img src="${SRC}">`;

const png = (name = "a.png") => new File(["x"], name, { type: "image/png" });

/** Đầu nội dung của khối thứ hai, tức một dòng ngay dưới "Intro". */
const secondLine = (e: Editor) => e.state.doc.child(0).nodeSize + 1;

function deferred() {
  let resolve!: (url: string | null) => void;
  const promise = new Promise<string | null>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const placeholder = (e: Editor) =>
  e.view.dom.querySelector(".image-upload-placeholder");

describe("imageFilesFrom", () => {
  const clipboard = (files: File[], html = "") => ({
    files: files as unknown as FileList,
    getData: (type: string) => (type === "text/html" ? html : ""),
  });

  it("ảnh chụp màn hình: chỉ có file", () => {
    const file = png();
    expect(imageFilesFrom(clipboard([file]))).toEqual([file]);
  });

  it("Copy image trên trình duyệt: HTML chỉ có một thẻ img", () => {
    const file = png();
    const html = '<meta charset="utf-8"><img src="https://a.dev/x.png">';
    expect(imageFilesFrom(clipboard([file], html))).toEqual([file]);
  });

  it("copy từ Excel hay Word: HTML có chữ, ảnh kèm theo chỉ là bản xem trước", () => {
    const html = "<table><tr><td>Fail-open</td></tr></table>";
    expect(imageFilesFrom(clipboard([png()], html))).toEqual([]);
  });

  it("chỉ lấy file ảnh", () => {
    const file = png();
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    expect(imageFilesFrom(clipboard([pdf, file]))).toEqual([file]);
  });

  it("không có clipboard", () => {
    expect(imageFilesFrom(null)).toEqual([]);
  });
});

describe("insertImages", () => {
  /** Chèn một ảnh ở chỗ con trỏ, như lúc tải xong. */
  function insertAtCaret(e: Editor): void {
    const image = e.schema.nodes.image.create({ src: SRC });
    e.view.dispatch(insertImages(e.state.tr, e.state.selection.from, [image]));
  }

  it("giữa dòng: tách dòng, ảnh vào giữa, con trỏ ở đầu nửa sau", () => {
    const e = open("<p>abcd</p>");
    e.commands.setTextSelection(3);
    insertAtCaret(e);
    expect(e.getHTML()).toBe(`<p>ab</p>${IMG}<p>cd</p>`);
    const { $from } = e.state.selection;
    expect($from.parent.textContent).toBe("cd");
    expect($from.parentOffset).toBe(0);
  });

  it("cuối dòng: ảnh xuống dưới, con trỏ vào dòng trống mới", () => {
    const e = open("<p>abc</p>");
    e.commands.setTextSelection(4);
    insertAtCaret(e);
    expect(e.getHTML()).toBe(`<p>abc</p>${IMG}<p></p>`);
    expect(e.state.selection.$from.index(0)).toBe(2);
  });

  it("đầu dòng: ảnh đứng trước dòng, không để lại dòng trống", () => {
    const e = open("<p>abc</p>");
    e.commands.setTextSelection(1);
    insertAtCaret(e);
    expect(e.getHTML()).toBe(`${IMG}<p>abc</p>`);
    expect(e.state.selection.$from.parent.textContent).toBe("abc");
  });

  it("dòng trống: ảnh đứng trên, con trỏ vẫn ở dòng trống bên dưới", () => {
    const e = open("<p>Intro</p><p></p>");
    e.commands.setTextSelection(secondLine(e));
    insertAtCaret(e);
    expect(e.getHTML()).toBe(`<p>Intro</p>${IMG}<p></p>`);
    expect(e.state.selection.$from.index(0)).toBe(2);
  });

  it("trong khối code: ảnh xuống dưới khối, code giữ nguyên", () => {
    const e = open("<pre><code>x = 1</code></pre>");
    e.commands.setTextSelection(3);
    insertAtCaret(e);
    const { doc } = e.state;
    expect(doc.child(0).type.name).toBe("codeBlock");
    expect(doc.child(0).textContent).toBe("x = 1");
    expect(doc.child(1).type.name).toBe("image");
  });
});

describe("startImageUpload", () => {
  it("lúc đang tải bài chưa đổi, chỉ có chỗ chờ; xong thì ảnh vào đúng chỗ", async () => {
    const e = open("<p>Intro</p><p></p>");
    const at = secondLine(e);
    e.commands.setTextSelection(at);
    const upload = deferred();
    const done = startImageUpload(e.view, [png()], at, () => upload.promise);

    // Không có link blob: nào trong nội dung, nên autosave có chạy lúc này
    // cũng không ghi gì sai.
    expect(e.getHTML()).toBe("<p>Intro</p><p></p>");
    expect(placeholder(e)).not.toBeNull();

    upload.resolve(SRC);
    await done;
    expect(e.getHTML()).toBe(`<p>Intro</p>${IMG}<p></p>`);
    expect(placeholder(e)).toBeNull();
  });

  it("gõ tiếp trong lúc chờ: ảnh vẫn đứng trước chữ vừa gõ", async () => {
    const e = open("<p>Intro</p><p></p>");
    const at = secondLine(e);
    e.commands.setTextSelection(at);
    const upload = deferred();
    const done = startImageUpload(e.view, [png()], at, () => upload.promise);

    e.commands.insertContent("caption");
    upload.resolve(SRC);
    await done;
    expect(e.getHTML()).toBe(`<p>Intro</p>${IMG}<p>caption</p>`);
  });

  it("nhiều ảnh: đúng thứ tự file dù ảnh sau tải xong trước", async () => {
    const e = open("<p>Intro</p><p></p>");
    const at = secondLine(e);
    const uploads = { "a.png": deferred(), "b.png": deferred() };
    const done = startImageUpload(
      e.view,
      [png("a.png"), png("b.png")],
      at,
      (file) => uploads[file.name as keyof typeof uploads].promise,
    );

    uploads["b.png"].resolve("https://cdn.dev/b.png");
    uploads["a.png"].resolve("https://cdn.dev/a.png");
    await done;
    expect(e.getHTML()).toBe(
      '<p>Intro</p><img src="https://cdn.dev/a.png"><img src="https://cdn.dev/b.png"><p></p>',
    );
  });

  it("tải lỗi: không chèn gì, chỗ chờ biến mất", async () => {
    const e = open("<p>Intro</p><p></p>");
    const done = startImageUpload(e.view, [png()], secondLine(e), async () => {
      throw new Error("network");
    });
    await done;
    expect(e.getHTML()).toBe("<p>Intro</p><p></p>");
    expect(placeholder(e)).toBeNull();
  });

  it("dòng chứa chỗ chờ bị xoá trong lúc tải: không chèn gì", async () => {
    const e = open("<p>Intro</p><p>gone</p>");
    const lineStart = e.state.doc.child(0).nodeSize;
    const upload = deferred();
    const done = startImageUpload(e.view, [png()], lineStart + 3, () => upload.promise);

    e.commands.deleteRange({
      from: lineStart,
      to: lineStart + e.state.doc.child(1).nodeSize,
    });
    upload.resolve(SRC);
    await done;
    expect(e.getHTML()).toBe("<p>Intro</p>");
  });
});
