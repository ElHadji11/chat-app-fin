"use client"

import { Preloaded, usePreloadedQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { api } from "../../../../convex/_generated/api";
import { MessageBubble, Message as MessageType } from "./message-bubble";

interface ChatListProps {
    userId: string;
    preloadedMessages: Preloaded<typeof api.chats.getMessages>;
    onReply: (message: MessageType) => void;
    onScrollToMessage: (messageId: string) => void;
    messageRefs: React.RefObject<Map<string, HTMLDivElement> | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    highlightedMessageId: string | null;
}

export default function ChatList({
    userId,
    preloadedMessages,
    onReply,
    onScrollToMessage,
    messageRefs,
    messagesEndRef,
    highlightedMessageId,
}: ChatListProps) {
    const messages = usePreloadedQuery(preloadedMessages)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, messagesEndRef])

    return (
        <div ref={containerRef}
            className="flex-1 overflow-y-auto bg-background dark:bg-[#0B141A] "
            style={{
                msOverflowStyle: 'none',  // Pour Internet Explorer et Edge
                scrollbarWidth: 'none',   // Pour Firefox
                WebkitOverflowScrolling: 'touch' // Améliore le défilement sur les appareils Apple (iOS)
            }
            }
        >
            <div className="p-4 flex flex-col space-y-2">
                {messages.map((msg) => {
                    // Transformation des données Convex vers le format attendu par MessageBubble
                    const messageForBubble: MessageType = {
                        id: msg.id,
                        content: msg.content,
                        senderId: msg.sender_userId!,
                        senderName: msg.sender,
                        type: msg.type as MessageType["type"],
                        mediaUrl: msg.mediaUrl,
                        duration: msg.duration,
                        waveformData: msg.waveformData,
                        fileName: msg.fileName,
                        timestamp: new Date(msg.creationTime),
                        isOwn: msg.sender_userId === userId,
                        replyTo: msg.replyTo ? {
                            id: msg.replyTo.id,
                            content: msg.replyTo.content,
                            sender: msg.replyTo.sender,
                            type: msg.replyTo.type as MessageType["type"],
                            duration: msg.replyTo.duration,
                            fileName: msg.replyTo.fileName,
                        } : undefined,
                    };

                    return (
                        <div
                            key={messageForBubble.id}
                            className={`${messageForBubble.id === highlightedMessageId ? 'bg-blue-500/10 rounded-md' : ''}`}
                            ref={(el) => {
                                if (el && messageRefs.current) messageRefs.current.set(messageForBubble.id, el);
                                else messageRefs.current?.delete(messageForBubble.id);
                            }}
                        >
                            <MessageBubble
                                message={messageForBubble}
                                onReply={onReply}
                                onQuoteClick={onScrollToMessage}
                            />
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

        </div>
    )
}