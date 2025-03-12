import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  blogs: defineTable({
    slug: v.string(),
    views: v.number(),
    likes: v.number(),
  }).index("by_slug", ["slug"]),
});
