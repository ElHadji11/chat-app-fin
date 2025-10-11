"use client"

import { Id } from "../../../../convex/_generated/dataModel"

import { Preloaded, usePreloadedQuery } from "convex/react"
import { useEffect, useRef } from "react"
import { api } from "../../../../convex/_generated/api";
import { VoiceMessage } from "./voice-message";
import { FileText } from "lucide-react";

interface Message {
    content: string;
    id: Id<"messages">;
    isSent: boolean;
    sender: string;
    sender_userId: string | undefined;
    time: string;
    type: "text" | "image" | "video" | "audio" | "file";
    mediaUrl?: string;
    audioUrl?: string;
    waveformData?: number[];
    duration?: number;
}

export default function ChatList({
    userId,
    preloadedMessages,
    preloadedConversationInfo
}: {
    userId: string,
    preloadedMessages: Preloaded<typeof api.chats.getMessages>
    preloadedConversationInfo: Preloaded<typeof api.chats.getConversationInfo>
}) {

    const messages = usePreloadedQuery(preloadedMessages)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <div ref={containerRef}
            className="flex-1 overflow-y-auto bg-background dark:bg-[#0B141A] max-h-[calc(100vh-135px)]"
            style={{
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
            }
            }
        >
            <div className="p-4 min-h-full flex flex-col space-y-4">
                {messages.map((message: Message) => {
                    const isMyMessage = message.sender_userId === userId

                    return (
                        <div key={message.id} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                            <div className={`rounded-lg p-3 max-w-xs lg:max-w-md ${isMyMessage ? "bg-primary dark:bg-[#005C4B] text-primary-foreground" : 'bg-muted dark:bg-[#202C33]'}`}>
                                {!isMyMessage && (
                                    <p className="text-xs dark:text-white text-muted-foreground mb-1">{message.sender}</p>
                                )}

                                {message.type === "image" && message.mediaUrl && (
                                    <img src={message.mediaUrl} alt="Image" className="w-full h-auto max-h-[300px] object-contain rounded-lg" />
                                )}

                                {message.type === "video" && message.mediaUrl && (
                                    <video src={message.mediaUrl} controls className="w-full h-auto max-h-[300px] object-contain rounded-lg" />
                                )}

                                {message.type === "audio" && message.mediaUrl && message.waveformData && message.duration && (
                                    <VoiceMessage
                                        audioUrl={message.mediaUrl}
                                        waveformData={message.waveformData}
                                        duration={message.duration}
                                    />
                                )}

                                {message.type === "file" && message.mediaUrl && (
                                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-secondary p-3 rounded-lg hover:bg-secondary/80">
                                        <FileText className="h-6 w-6 shrink-0" />
                                        <p className="text-sm dark:text-white break-words whitespace-pre-wrap">{message.content || "File"}</p>
                                    </a>
                                )}

                                {message.type === "text" && (
                                    <p className="text-sm dark:text-white break-words whitespace-pre-wrap">{message.content}</p>
                                )}

                                <p className="text-right text-xs text-muted-foreground mt-1">{message.time}</p>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

        </div>
    )
}