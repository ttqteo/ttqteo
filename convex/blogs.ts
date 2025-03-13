import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAllBlogs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("blogs").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blogs")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();
  },
});

export const incrementViews = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const existingBlog = await ctx.db
      .query("blogs")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    if (!existingBlog) {
      return await ctx.db.insert("blogs", {
        slug: args.slug,
        views: 1,
        likes: 0,
      });
    }

    return await ctx.db.patch(existingBlog._id, {
      views: (existingBlog.views ?? 0) + 1,
    });
  },
});

export const incrementLikes = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const existingBlog = await ctx.db
      .query("blogs")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    if (!existingBlog) {
      return await ctx.db.insert("blogs", {
        slug: args.slug,
        views: 0,
        likes: 1,
      });
    }

    return await ctx.db.patch(existingBlog._id, {
      likes: (existingBlog.likes ?? 0) + 1,
    });
  },
});
