import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        name: v.string(),
        email: v.string(),
        image: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
    }).index("by_clerk_id", ["clerkId"]),

    conversations: defineTable({
        participantOne: v.id("users"),
        participantTwo: v.id("users"),
        updatedAt: v.number(),
        lastMessageId: v.optional(v.id("messages")),
        deletedBy: v.optional(v.array(v.id("users"))),
    })
        .index("by_participants", ["participantOne", "participantTwo"])
        .index("by_participantOne", ["participantOne"])
        .index("by_participantTwo", ["participantTwo"]),
    // .index("by_last_update", ["_lastUpdateTime"]), // Correction ici

    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
        type: v.union(
            v.literal("text"),
            v.literal("image"),
            v.literal("video"),
            v.literal("audio"),
            v.literal("file")
        ),
        mediaUrl: v.optional(v.string()),
        replyTo: v.optional(v.id("messages")),
        updatedAt: v.number(),
        isEdited: v.boolean(),
        deletedBy: v.optional(v.array(v.id("users"))),
        readBy: v.optional(v.array(v.id("users"))),

    })

        .index("by_conversation", ["conversationId"]) // Correction ici
        .index("by_sender", ["senderId"]),

    media: defineTable({
        messageId: v.id("messages"),
        url: v.string(),
        type: v.union(
            v.literal("image"),
            v.literal("video"),
            v.literal("audio"),
            v.literal("file")
        ),
        size: v.number(),
        mimeType: v.string(),
        duration: v.optional(v.number()),
        fileName: v.string(),
    })
        .index("by_message", ["messageId"])
        .index("by_type", ["type"]),
});