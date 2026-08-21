// Sinh supabase/seed_java_core.sql tu ban markdown goc cua ebook Java Core.
// Chay: node scripts/build-java-core-sql.mjs
// Nguon la source of truth; sua file .md roi chay lai script nay, dung sua trong admin editor
// (TipTap StarterKit khong co extension table nen se nuot het <table>).
import { marked } from "../node_modules/.pnpm/marked@16.4.2/node_modules/marked/lib/marked.esm.js";
import fs from "fs";
import path from "path";

const SRC = "D:/ttqspace/cv/My_Software_Engineer_Resume/Java-EBook-master";

const CH = [
  ["00-Gioi-Thieu.md","java-gioi-thieu","Giới thiệu: Hiểu đúng từ bản chất",
   "Cuốn sách này dành cho ai, đọc thế nào, và quy ước dùng xuyên suốt.","intro",0],
  ["01-Cach-Java-Hoat-Dong.md","java-cach-hoat-dong","Phần 1 – Cách Java hoạt động thực sự",
   "Từ source code tới bytecode, JVM/JDK/JRE, ClassLoader, Stack vs Heap, và GC cơ bản.","internals",1],
  ["02-Kieu-Du-Lieu-Memory-Model.md","java-memory-model","Phần 2 – Kiểu dữ liệu và Memory Model",
   "Primitive vs reference, pass by value, autoboxing, String Pool, final, == vs equals, Integer cache.","internals",2],
  ["03-OOP-Deep-Dive.md","java-oop-deep-dive","Phần 3 – OOP Deep Dive",
   "Encapsulation ở mức bộ nhớ, inheritance bên dưới, polymorphism runtime, interface vs abstract, composition.","oop-data",3],
  ["04-Collection-Framework.md","java-collection-framework","Phần 4 – Collection Framework",
   "ArrayList, LinkedList, HashMap chi tiết, contract equals/hashCode, TreeMap, Iterator, ConcurrentHashMap.","oop-data",4],
  ["05-Exception-Multithreading.md","java-exception-multithreading","Phần 5 – Exception và Multithreading",
   "Checked vs unchecked, custom exception, Thread, synchronized, volatile, deadlock, ExecutorService.","advanced",5],
  ["06-Hieu-Lam-Nguy-Hiem.md","java-hieu-lam-nguy-hiem","Phần 6 – Những hiểu lầm nguy hiểm",
   "Sáu hiểu lầm phổ biến nhất về Java Core, mổ xẻ tận gốc, kèm tổng hợp các bẫy thường gặp.","advanced",6],
];

function clean(raw, isIntro) {
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const l = lines[i].trim();
    if (l.startsWith("# ") || l.startsWith("### Cuốn sách dành cho") || l === "---" || l === "") { i++; continue; }
    break;
  }
  let s = lines.slice(i).join("\n");
  // Hub tu render muc luc roi, chuong gioi thieu khong can lap lai
  if (isIntro) s = s.replace(/\n## Mục lục tổng quan[\s\S]*?(?=\n## )/, "\n");
  // marked doc `<Integer>` nhu the HTML tag; day la cho duy nhat trong ca cuon
  s = s.replace("Collection (List<Integer>)", "Collection (`List<Integer>`)");
  return s.trim();
}

marked.setOptions({ gfm: true, breaks: false });

const q = (v) => "'" + String(v).replace(/'/g, "''") + "'";
const out = [];
out.push("-- Seed: Java Core series (7 chuong, type='guide', tags='java-core').");
out.push("-- Sinh boi scripts/build-java-core-sql.mjs. Dung sua file nay bang tay.");
out.push("-- Chay trong Supabase SQL editor. Idempotent: chay lai se cap nhat theo slug.");
out.push("");
out.push("begin;");
out.push("");

let total = 0;
for (const [file, slug, title, description, section, order] of CH) {
  const raw = fs.readFileSync(path.join(SRC, file), "utf8").replace(/^\uFEFF/, "");
  const content = marked.parse(clean(raw, file.startsWith("00")));
  if (content.includes("$jc$")) throw new Error("dollar-quote tag collides in " + slug);
  total += content.length;
  out.push("insert into public.blogs (slug, title, description, content, is_published, type, tags, guide_section, guide_order)");
  // Cot `content` tren DB that van la kieu json (migration update_blogs_schema.sql
  // chua duoc chay). to_json(...::text) boc HTML thanh mot JSON string, dung y het
  // cac row dang co, nen supabase-js van tra ve string HTML nhu cu.
  out.push("values (" + q(slug) + ", " + q(title) + ", " + q(description) + ", to_json($jc$" + content + "$jc$::text), false, 'guide', 'java-core', " + q(section) + ", " + order + ")");
  out.push("on conflict (slug) do update set");
  out.push("  title = excluded.title,");
  out.push("  description = excluded.description,");
  out.push("  content = excluded.content,");
  out.push("  type = excluded.type,");
  out.push("  tags = excluded.tags,");
  out.push("  guide_section = excluded.guide_section,");
  out.push("  guide_order = excluded.guide_order,");
  out.push("  updated_at = timezone('utc'::text, now()),");
  out.push("  deleted_at = null;");
  out.push("");
  console.log(slug.padEnd(34) + String((content.length / 1024).toFixed(0)).padStart(4) + " KB html");
}

out.push("commit;");
out.push("");

const dest = "supabase/seed_java_core.sql";
fs.writeFileSync(dest, out.join("\n"), "utf8");
console.log("\ntotal html : " + (total / 1024).toFixed(0) + " KB");
console.log("wrote " + dest + " (" + (fs.statSync(dest).size / 1024).toFixed(0) + " KB)");
