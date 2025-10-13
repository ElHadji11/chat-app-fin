"use client"

import { Mic, Video, FileText } from "lucide-react"

interface QuotedMessageProps {
    content: string
    sender: string
    type: "text" | "audio" | "video" | "file" | "image"
    duration?: number
    fileName?: string
    onClick: () => void
    isOwn: boolean
}

export function QuotedMessage({ content, sender, type, duration, fileName, onClick, isOwn }: QuotedMessageProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const renderPreview = () => {
        switch (type) {
            case "audio":
                return (
                    <div className="flex items-center gap-1.5">
                        <Mic className="h-3 w-3" />
                        <span className="text-xs">Voice message</span>
                        {duration && <span className="text-xs opacity-70">{formatTime(duration)}</span>}
                    </div>
                )
            case "video":
                return (
                    <div className="flex items-center gap-1.5">
                        <Video className="h-3 w-3" />
                        <span className="text-xs">Video</span>
                    </div>
                )
            case "file":
                return (
                    <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" />
                        <span className="text-xs truncate">{fileName || "file"}</span>
                    </div>
                )
            default:
                return <p className="text-xs truncate">{content}</p>
        }
    }

    return (
        <div
            onClick={onClick}
            className={`mb-2 pb-2 border-l-2 border-primary pl-2 cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? "bg-primary-foreground/10" : "bg-secondary/50"
                } rounded p-2 -mx-2`}
        >
            <p className={`text-xs font-medium mb-1 ${isOwn ? "text-primary-foreground" : "text-primary"}`}>{sender}</p>
            <div className={isOwn ? "text-primary-foreground/80" : "text-muted-foreground"}>{renderPreview()}</div>
        </div>
    )
}
