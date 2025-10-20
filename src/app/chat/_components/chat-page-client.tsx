"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import ChatList from "./chat-list"
import FormChat from "./form"
import { Preloaded, useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Message as MessageType } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { Id } from "../../../../convex/_generated/dataModel"

interface ChatPageClientProps {
    userId: string
    conversationId: string
    preloadedMessages: Preloaded<typeof api.chats.getMessages>
}

export default function ChatPageClient({
    userId,
    conversationId,
    preloadedMessages
}: ChatPageClientProps) {
    const [replyTo, setReplyTo] = useState<MessageType | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
    const [draft, setDraft] = useState("")

    const updateDraftMutation = useMutation(api.chats.updateDraft)
    const startTypingMutation = useMutation(api.chats.startTyping)
    const stopTypingMutation = useMutation(api.chats.stopTyping)

    const conversationInfo = useQuery(api.chats.getConversationInfo, {
        conversationId: conversationId as Id<"conversations">,
        userId: userId
    })

    const initialDraft = useQuery(api.chats.getDraft, {
        conversationId: conversationId as Id<"conversations">
    })


    // ✅ Récupérer les noms des utilisateurs qui tapent
    const typingUsers = conversationInfo?.typingUsers || []
    const isOtherUserTyping = typingUsers.length > 0

    useEffect(() => {
        if (initialDraft?.content) {
            setDraft(initialDraft.content)
        }
    }, [initialDraft])

    const handleSetReply = (message: MessageType) => {
        setReplyTo(message)
    }

    const handleCancelReply = () => {
        setReplyTo(null)
    }

    const handleScrollToMessage = useCallback((messageId: string) => {
        const messageElement = messageRefs.current.get(messageId)
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
            setHighlightedMessageId(messageId)
            setTimeout(() => {
                setHighlightedMessageId(null)
            }, 2000)
        }
    }, [])

    // ✅ Handler pour démarrer le typing
    const handleTypingStart = useCallback(async () => {
        try {
            await startTypingMutation({
                conversationId: conversationId as Id<"conversations">,
                userId: userId // ✅ Passer clerkId (string)
            })
        } catch (error) {
            console.error("❌ Error starting typing:", error)
        }
    }, [conversationId, userId, startTypingMutation])

    // ✅ Handler pour arrêter le typing
    const handleTypingStop = useCallback(async () => {
        try {
            await stopTypingMutation({
                conversationId: conversationId as Id<"conversations">,
                userId: userId // ✅ Passer clerkId (string)
            })
        } catch (error) {
            console.error("❌ Error stopping typing:", error)
        }
    }, [conversationId, userId, stopTypingMutation])

    // ✅ Handler pour mettre à jour le draft
    const handleDraftUpdate = useCallback(async (content: string) => {
        try {
            await updateDraftMutation({
                conversationId: conversationId as Id<"conversations">,
                content: content
            })
            setDraft(content)
        } catch (error) {
            console.error("❌ Error updating draft:", error)
        }
    }, [conversationId, updateDraftMutation])

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                {/* Zone de messages scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <ChatList
                        userId={userId}
                        preloadedMessages={preloadedMessages}
                        onReply={handleSetReply}
                        onScrollToMessage={handleScrollToMessage}
                        messageRefs={messageRefs}
                        messagesEndRef={messagesEndRef}
                        highlightedMessageId={highlightedMessageId}
                    />
                </div>

                {/* ✅ Indicateur de frappe */}
                <TypingIndicator
                    // userNames={typingUsers}
                    isVisible={isOtherUserTyping}
                />

                {/* Zone de saisie */}
                <div className="shrink-0">
                    <FormChat
                        userId={userId}
                        conversationId={conversationId}
                        replyTo={replyTo}
                        onCancelReply={handleCancelReply}
                        onScrollToMessage={handleScrollToMessage}
                        initialDraft={draft}
                        onTypingStart={handleTypingStart}
                        onTypingStop={handleTypingStop}
                        onDraftUpdate={handleDraftUpdate}
                    />
                </div>
            </div>
        </div>
    )
}