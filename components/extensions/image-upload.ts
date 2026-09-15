import { Extension } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

/**
 * Dán ảnh (ảnh chụp màn hình, "Copy image" trên trình duyệt, file copy từ
 * Explorer hay Finder) hoặc thả file ảnh vào editor: tải lên như nút Chèn >
 * Ảnh, rồi đặt ảnh đúng chỗ dán.
 *
 * Trong lúc tải, chỗ đó là một decoration chứ không phải một node. Nội dung
 * bài không đổi cho tới khi có URL thật, nên autosave không bao giờ ghi một
 * link `blob:` chỉ sống trong tab này. Decoration tự dời theo mọi thay đổi,
 * nên gõ tiếp trong lúc chờ không làm ảnh rơi sai chỗ. Cách làm theo ví dụ
 * upload của ProseMirror.
 */

type UploadId = object;

type Meta =
  | { add: { id: UploadId; pos: number; dom: HTMLElement } }
  | { remove: UploadId };

const uploadKey = new PluginKey<DecorationSet>("imageUpload");

export const ImageUpload = Extension.create({
  name: "imageUpload",

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: uploadKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(uploadKey) as Meta | undefined;
            if (meta && "add" in meta) {
              const { id, pos, dom } = meta.add;
              // side -1: chữ gõ tiếp ngay tại đó nằm sau chỗ chờ, nên ảnh vẫn
              // đứng trước đoạn vừa gõ.
              next = next.add(tr.doc, [
                Decoration.widget(pos, dom, { id, side: -1 }),
              ]);
            } else if (meta && "remove" in meta) {
              next = next.remove(
                next.find(undefined, undefined, (spec) => spec.id === meta.remove),
              );
            }
            return next;
          },
        },
        props: {
          decorations: (state) => uploadKey.getState(state),
        },
      }),
    ];
  },
});

/**
 * Ảnh nên tải lên từ một lần dán hay thả, hoặc mảng rỗng để ProseMirror dán
 * như thường.
 *
 * Word, Excel và PowerPoint copy kèm một ảnh chụp vùng chọn bên cạnh HTML.
 * HTML có chữ thì người dùng đang dán chữ, ảnh kia chỉ là bản xem trước. Còn
 * "Copy image" trên trình duyệt thì HTML chỉ có một thẻ `<img>` trỏ về trang
 * gốc: tải file lên thì ảnh là của mình, không phụ thuộc trang kia còn giữ.
 */
export function imageFilesFrom(
  data: Pick<DataTransfer, "files" | "getData"> | null,
): File[] {
  if (!data) return [];
  const images = Array.from(data.files).filter((file) =>
    file.type.startsWith("image/"),
  );
  if (images.length === 0) return [];
  const html = data.getData("text/html");
  if (
    html &&
    new DOMParser().parseFromString(html, "text/html").body.textContent?.trim()
  ) {
    return [];
  }
  return images;
}

/**
 * Đặt các ảnh vào chỗ `at`. Ảnh là khối nên không đứng giữa dòng được: dòng
 * bị tách đôi và ảnh vào giữa. Nửa trước rỗng (dán ở đầu dòng, hay trên một
 * dòng trống) thì không tách, ảnh đứng ngay trước dòng. Con trỏ đang ở `at`
 * được ánh xạ về đầu nửa sau, tức ngay dưới ảnh, sẵn để viết tiếp.
 */
export function insertImages(
  tr: Transaction,
  at: number,
  images: readonly ProseMirrorNode[],
): Transaction {
  const $at = tr.doc.resolve(at);
  const { parent } = $at;
  if (!parent.isTextblock) return tr.insert(at, images);
  // Khối code không tách: ảnh xuống ngay dưới khối.
  if (parent.type.spec.code) return tr.insert($at.after(), images);
  if ($at.parentOffset === 0) return tr.insert($at.before(), images);
  return tr.split(at).insert(at + 1, images);
}

function placeholderAt(state: EditorState, id: UploadId): number | null {
  const found = uploadKey
    .getState(state)
    ?.find(undefined, undefined, (spec) => spec.id === id);
  return found && found.length > 0 ? found[0].from : null;
}

function placeholderDom(previews: readonly string[]): HTMLElement {
  const wrap = document.createElement("span");
  wrap.className = "image-upload-placeholder";
  wrap.setAttribute("aria-label", "Đang tải ảnh lên");
  for (const src of previews) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    wrap.append(img);
  }
  return wrap;
}

/**
 * Tải `files` lên rồi đặt ảnh vào `at`. Tải song song, chèn một lần theo đúng
 * thứ tự file. Ảnh nào lỗi thì bỏ (`upload` tự báo lỗi). Dòng chứa chỗ chờ bị
 * xoá trong lúc tải thì không chèn gì: người viết đã bỏ chỗ đó.
 */
export function startImageUpload(
  view: EditorView,
  files: readonly File[],
  at: number,
  upload: (file: File) => Promise<string | null>,
): Promise<void> {
  const id: UploadId = {};
  const previews = files.map((file) => URL.createObjectURL(file));
  const add: Meta = { add: { id, pos: at, dom: placeholderDom(previews) } };
  view.dispatch(view.state.tr.setMeta(uploadKey, add));

  return Promise.all(files.map((file) => upload(file).catch(() => null)))
    .then((urls) => {
      if (view.isDestroyed) return;
      const remove: Meta = { remove: id };
      const tr = view.state.tr.setMeta(uploadKey, remove);
      const pos = placeholderAt(view.state, id);
      const imageType = view.state.schema.nodes.image;
      const images = urls.flatMap((src) =>
        src ? [imageType.create({ src })] : [],
      );
      if (pos !== null && images.length > 0) insertImages(tr, pos, images);
      view.dispatch(tr);
    })
    .finally(() => previews.forEach((src) => URL.revokeObjectURL(src)));
}
