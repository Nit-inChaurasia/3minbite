import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const joinWaitlist = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const normalized = email.trim().toLowerCase();
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .unique();
    if (existing) return { status: "already_joined" };
    await ctx.db.insert("waitlist", { email: normalized, createdAt: Date.now() });
    return { status: "joined" };
  },
});
