import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// createOrGetConversation()
export const createOrGetConversation = mutation({
    args: {
        participantUserId: v.string(),
        currentUserId: v.string(),
    },
    handler: async (ctx, args) => {
        // Get both users' Convex IDs from their Clerk IDs
        const currentUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.currentUserId))
            .first();

        const otherUser = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.participantUserId))
            .first();

        if (!currentUser || !otherUser) {
            throw new Error("User not found");
        }

        const existingConversation = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.or(
                    q.and(
                        q.eq(q.field("participantOne"), currentUser._id),
                        q.eq(q.field("participantTwo"), otherUser._id)
                    ),
                    q.and(
                        q.eq(q.field("participantOne"), otherUser._id),
                        q.eq(q.field("participantTwo"), currentUser._id)
                    )
                )
            )
            .first();

        if (existingConversation) {
            const deletedByArray = existingConversation.deletedBy || [];
            const updatedDeletedBy = deletedByArray.filter(id => id !== currentUser._id);

            await ctx.db.patch(existingConversation._id, {
                deletedBy: updatedDeletedBy,
                updatedAt: Date.now(),

            });

            return existingConversation?._id;
        }

        const conversationId = await ctx.db.insert("conversations", {
            participantOne: currentUser._id,
            participantTwo: otherUser._id,
            updatedAt: Date.now(),
        });

        return conversationId;
    },
});

// sendMessage()
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        senderId: v.string(),
        type: v.optional(v.union(v.literal("text"), v.literal("image"))),
        mediaUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const sender = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.senderId))
            .first();

        if (!sender) throw new Error("Sender not found");

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: sender._id,
            content: args.content,
            type: args.type ?? "text",
            mediaUrl: args.mediaUrl,
            updatedAt: Date.now(),
            isEdited: false,
            deletedBy: [],
            readBy: [sender._id]
        });

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
            deletedBy: [],
            updatedAt: Date.now(),
        });

        return messageId;
    },
});

const formatChatTime = (date: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
        // Today: show time only
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (date.toDateString() === yesterday.toDateString()) {
        // Yesterday
        return 'Yesterday';
    } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
        // Within last week: show day name
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
        // Older: show date
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
};

// getMessages()
export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {

        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.userId))
            .first();

        if (!user) throw new Error("User not found");

        const allMessages = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
            .order("asc")
            .take(args.limit ?? 50);

        const visibleMessages = allMessages.filter(msg => {
            const deletedByArray = msg.deletedBy || [];
            return !deletedByArray.includes(user._id);
        });

        return await Promise.all(
            visibleMessages.map(async (msg) => {
                const sender = await ctx.db.get(msg.senderId);
                return {
                    id: msg._id,
                    sender_userId: sender?.clerkId,
                    sender: sender?.name ?? "Unknown",
                    content: msg.content,
                    time: formatChatTime(new Date(msg._creationTime)),
                    isSent: true,
                    type: msg.type,
                    mediaUrl: msg.mediaUrl,
                };
            })
        );
    },
});

// getConversation()
export const getConversation = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.userId))
            .first();

        if (!user) {
            return [];
        }

        const conversations = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.or(
                    q.eq(q.field("participantOne"), user._id),
                    q.eq(q.field("participantTwo"), user._id)
                ),
            )
            .collect();

        const filteredConversations = conversations
            .filter((conv: Doc<"conversations">) => {
                const deletedByArray = conv.deletedBy || [];
                return !deletedByArray.includes(user._id);
            });

        const conversationsWithDetails = await Promise.all(
            filteredConversations.map(async (conv) => {
                const otherParticipantId =
                    conv.participantOne === user._id
                        ? conv.participantTwo
                        : conv.participantOne;

                const otherUser = await ctx.db.get(otherParticipantId);

                const allMessages = await ctx.db
                    .query("messages")
                    .filter((q) => q.eq(q.field("conversationId"), conv._id))
                    .order("desc")
                    .collect();

                const visibleMessages = allMessages.filter(msg => {
                    const deletedByArray = msg.deletedBy || [];
                    return !deletedByArray.includes(user._id);
                });

                const lastVisibleMessage = visibleMessages[0]; // Le plus récent

                // Compter les messages non lus
                const unreadCount = visibleMessages.filter(msg => {
                    const readByArray = msg.readBy || [];
                    const isFromOther = msg.senderId !== user._id;
                    const isUnread = !readByArray.includes(user._id);
                    return isFromOther && isUnread;
                }).length;

                return {
                    id: conv._id,
                    name: otherUser?.name ?? "Unknown",
                    chatImage: otherUser?.image,
                    lastMessage: lastVisibleMessage?.content ?? "",
                    time: formatChatTime(new Date(conv.updatedAt)),
                    unread: unreadCount,
                    type: lastVisibleMessage?.type,
                    isLastMessageFromMe: lastVisibleMessage?.senderId === user._id,
                };
            })
        );

        return conversationsWithDetails.sort((a: any, b: any) => {
            if (a.unread > 0 && b.unread === 0) return -1;
            if (a.unread === 0 && b.unread > 0) return 1;

            const aTime = new Date(a.time).getTime() || 0;
            const bTime = new Date(b.time).getTime() || 0;
            return bTime - aTime;
        });
    },
});

// delete should work only in one side participant can delete the conversation and not both
export const deleteConversation = mutation({
    args: {
        userId: v.string(),
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) {
            throw new Error("Conversation not found");
        }

        if (
            conversation.participantOne !== user._id &&
            conversation.participantTwo !== user._id
        ) {
            throw new Error("Unauthorized to delete this conversation");
        }

        // ✅ NOUVEAU: Mark ALL messages in conversation as deleted for this user
        const allMessages = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
            .collect();

        // Update each message to mark it as deleted for this user
        await Promise.all(
            allMessages.map(async (msg) => {
                const deletedByArray = [...(msg.deletedBy || [])];
                if (!deletedByArray.includes(user._id)) {
                    deletedByArray.push(user._id);
                }
                await ctx.db.patch(msg._id, {
                    deletedBy: deletedByArray,
                });
            })
        );

        // ✅ NOUVEAU: Mark conversation as deleted for this user
        const conversationDeletedBy = [...(conversation.deletedBy || [])];
        if (!conversationDeletedBy.includes(user._id)) {
            conversationDeletedBy.push(user._id);
        }

        await ctx.db.patch(args.conversationId, {
            deletedBy: conversationDeletedBy,
        });

        return {
            success: true,
            message: "Conversation and all messages marked as deleted for this user",
            deletedMessages: allMessages.length,
        };
    },
});


// Nouvelle fonction pour marquer les messages comme lus
export const markMessagesAsRead = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("clerkId"), args.userId))
            .first();

        if (!user) throw new Error("User not found");

        // Récupérer tous les messages de cette conversation
        const messages = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
            .collect();

        // Marquer tous les messages comme lus par cet utilisateur
        const updates = messages
            .filter(msg => {
                // Seulement les messages que l'utilisateur peut voir
                const deletedByArray = msg.deletedBy || [];
                return !deletedByArray.includes(user._id);
            })
            .map(async (msg) => {
                const readByArray = msg.readBy || [];
                if (!readByArray.includes(user._id)) {
                    readByArray.push(user._id);
                    await ctx.db.patch(msg._id, {
                        readBy: readByArray,
                    });
                }
            });

        await Promise.all(updates);

        return { success: true, updatedMessages: updates.length };
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

export const getUploadUrl = mutation({
    args: {
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const url = await ctx.storage.getUrl(args.storageId);
        return url;
    },
});