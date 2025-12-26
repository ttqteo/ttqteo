"use server";

import fs from "fs/promises";
import path from "path";

export async function getMindmapDocs() {
  const docsDir = path.join(process.cwd(), "docs", "mindmap");
  try {
    const files = await fs.readdir(docsDir);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    const docs = await Promise.all(
      mdFiles.map(async (file) => {
        const content = await fs.readFile(path.join(docsDir, file), "utf-8");
        return {
          name: file.replace(".md", ""),
          title: file
            .replace(".md", "")
            .split("-")
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(" "),
          content,
        };
      })
    );

    return docs;
  } catch (error) {
    console.error("Error reading mindmap docs:", error);
    return [];
  }
}
