"use client"

import { useRef, useState, type TouchEvent } from "react"
import { CornerUpLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuotedMessage } from "./quoted-message"
import { VoiceMessage } from "./voice-message"
import Image from "next/image"

export interface Message {
    id: string
    content: string
    senderId: string
    senderName: string
    type: "text" | "audio" | "video" | "file" | "image"
    mediaUrl?: string
    duration?: number
    waveformData?: number[]
    fileName?: string
    timestamp: Date
    isOwn: boolean
    replyTo?: {
        id: string
        content: string
        sender: string
        type: "text" | "audio" | "video" | "file" | "image"
        duration?: number
        fileName?: string
    }
}

interface MessageBubbleProps {
    message: Message
    onReply: (message: Message) => void
    onQuoteClick: (messageId: string) => void
}

export function MessageBubble({ message, onReply, onQuoteClick }: MessageBubbleProps) {
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const messageRef = useRef<HTMLDivElement>(null)

    const minSwipeDistance = 50

    const handleTouchStart = (e: TouchEvent) => {
        setTouchEnd(null)
        setTouchStart(e.targetTouches[0].clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return

        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if ((message.isOwn && isLeftSwipe) || (!message.isOwn && isRightSwipe)) {
            onReply(message)
        }

        setTouchStart(null)
        setTouchEnd(null)
    }

    const renderMessageContent = () => {
        switch (message.type) {
            case "audio":
                if (message.mediaUrl && message.waveformData && message.duration != null) {
                    return (
                        <VoiceMessage
                            audioUrl={message.mediaUrl}
                            waveformData={message.waveformData}
                            duration={message.duration}
                        />
                    )
                }
                return <span>Error displaying audio</span>

            case "video":
                return (
                    <video
                        src={message.mediaUrl}
                        controls
                        className="w-full max-w-xs rounded-lg max-h-80"
                    />
                )

            case "image":
                return (
                    <Image
                        src={message.mediaUrl!}
                        alt="Image"
                        className="w-full max-w-xs object-cover rounded-lg"
                    />
                )

            case "file":
                return (
                    <a
                        href={message.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline"
                    >
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate">
                            {message.fileName || "Document"}
                        </span>
                    </a>
                )

            default:
                return (
                    <p className="text-sm break-words whitespace-pre-wrap">
                        {message.content}
                    </p>
                )
        }
    }

    return (
        <div
            ref={messageRef}
            className={`w-full flex ${message.isOwn ? "justify-end" : "justify-start"} group`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Bouton de réponse - visible au hover */}
            <div className="relative">
                {/* Positionné différemment selon isOwn */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`
                        absolute top-1/2 -translate-y-1/2 h-8 w-8 
                        opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 z-10
                        ${message.isOwn ? "-left-10" : "-right-10"}
                    `}
                    onClick={(e) => {
                        e.stopPropagation()
                        console.log("Reply clicked for message:", message.id)
                        onReply(message)
                    }}
                >
                    <CornerUpLeft className="h-4 w-4" />
                </Button>

                {/* La bulle du message */}
                <div
                    className={`
                        max-w-xs md:max-w-md 
                        ${message.isOwn
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                            : "bg-card border border-border rounded-2xl rounded-tl-sm"
                        } 
                        px-4 py-2 shadow-sm
                    `}
                >
                    {/* Message cité (si existe) */}
                    {message.replyTo && (
                        <QuotedMessage
                            content={message.replyTo.content}
                            sender={message.replyTo.sender}
                            type={message.replyTo.type}
                            duration={message.replyTo.duration}
                            fileName={message.replyTo.fileName}
                            onClick={() => onQuoteClick(message.replyTo!.id)}
                            isOwn={message.isOwn}
                        />
                    )}

                    {/* Contenu du message */}
                    {renderMessageContent()}

                    {/* Timestamp */}
                    <p
                        className={`
                            text-[10px] mt-1 text-right 
                            ${message.isOwn
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }
                        `}
                    >
                        {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                </div>
            </div>
        </div>
    )
}