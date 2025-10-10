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
        replyTo: v.optional(v.id("messages")),
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
            readBy: [sender._id],
            replyTo: args.replyTo,
        });

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        const now = Date.now();
        if (conversation.isDraft) {
            await ctx.db.patch(args.conversationId, {
                isDraft: false,
                updatedAt: now,
                deletedBy: [],
            });
        }

        await ctx.db.patch(args.conversationId, {
            lastMessageId: messageId,
            deletedBy: [],
            // updatedAt: now,
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


        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (conversation.isDraft) {
            return [];
        }

        const otherParticipantId =
            conversation.participantOne === user._id
                ? conversation.participantTwo
                : conversation.participantOne;

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
                const readByArray = msg.readBy || [];

                let replyToMessage = null;
                if (msg.replyTo) {
                    const originalMessage = await ctx.db.get(msg.replyTo);
                    if (originalMessage) {
                        const originalSender = await ctx.db.get(originalMessage.senderId);
                        replyToMessage = {
                            id: originalMessage._id,
                            content: originalMessage.content,
                            sender: originalSender?.name ?? "Unknown",
                            senderId: originalMessage.senderId,
                            type: originalMessage.type,
                            mediaUrl: originalMessage.mediaUrl,
                        };
                    }
                }

                return {
                    id: msg._id,
                    sender_userId: sender?.clerkId,
                    sender: sender?.name ?? "Unknown",
                    content: msg.content,
                    time: formatChatTime(new Date(msg._creationTime)),
                    isSent: true,
                    type: msg.type,
                    mediaUrl: msg.mediaUrl,
                    isMyMessage: msg.senderId === user._id,
                    isDelivered: true,
                    isRead: readByArray.includes(otherParticipantId),
                    replyTo: replyToMessage
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
                const isDraft = conv.isDraft || false;
                const isDeleted = deletedByArray.includes(user._id);
                return !isDeleted && !isDraft;
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

                let isLastMessageRead = false;
                if (lastVisibleMessage && lastVisibleMessage.senderId === user._id) {
                    const readByArray = lastVisibleMessage.readBy || [];
                    isLastMessageRead = readByArray.includes(otherParticipantId);
                }

                const sortTimestamp = lastVisibleMessage
                    ? lastVisibleMessage._creationTime
                    : conv._creationTime;

                return {
                    id: conv._id,
                    name: otherUser?.name ?? "Unknown",
                    chatImage: otherUser?.image,
                    lastMessage: lastVisibleMessage?.content ?? "",
                    time: formatChatTime(new Date(sortTimestamp)),
                    unread: unreadCount,
                    type: lastVisibleMessage?.type,
                    isLastMessageFromMe: lastVisibleMessage?.senderId === user._id,
                    sortTimestamp,
                    isLastMessageRead: isLastMessageRead
                };
            })
        );

        return conversationsWithDetails.sort((a: any, b: any) => {
            return b.sortTimestamp - a.sortTimestamp;
        });
    },
});

//delete
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

//for drafts 
export const createDraftConversation = mutation({
    args: {
        participantUserId: v.string(),
        currentUserId: v.string(),
    },
    handler: async (ctx, args) => {
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

        // Vérifier s'il existe déjà une conversation (draft ou réelle)
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
            // Si c'est un draft, le "réactiver" pour cet utilisateur
            if (existingConversation.isDraft) {
                const deletedByArray = existingConversation.deletedBy || [];
                const updatedDeletedBy = deletedByArray.filter(id => id !== currentUser._id);

                await ctx.db.patch(existingConversation._id, {
                    deletedBy: updatedDeletedBy,
                    updatedAt: Date.now(),
                });
            }
            return existingConversation._id;
        }

        // Créer une nouvelle conversation brouillon
        const conversationId = await ctx.db.insert("conversations", {
            participantOne: currentUser._id,
            participantTwo: otherUser._id,
            updatedAt: Date.now(),
            isDraft: true, // ✅ Marquer comme brouillon
        });

        return conversationId;
    },
});

export const getConversationInfo = query({
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

        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        // Vérifier que l'utilisateur fait partie de la conversation
        if (conversation.participantOne !== user._id && conversation.participantTwo !== user._id) {
            throw new Error("Unauthorized");
        }

        const otherParticipantId =
            conversation.participantOne === user._id
                ? conversation.participantTwo
                : conversation.participantOne;

        const otherUser = await ctx.db.get(otherParticipantId);

        return {
            id: conversation._id,
            name: otherUser?.name ?? "Unknown",
            image: otherUser?.image,
            isDraft: conversation.isDraft || false,
        };
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