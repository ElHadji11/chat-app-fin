"use client"

import { Mic, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReplyPreviewBarProps {
    sender: string
    content: string
    type: "text" | "audio" | "video" | "file"
    duration?: number
    fileName?: string
    onClose: () => void
    onClick: () => void
}

export function ReplyPreviewBar({
    sender,
    content,
    type,
    duration,
    fileName,
    onClose,
    onClick,
}: ReplyPreviewBarProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getPreviewContent = () => {
        switch (type) {
            case "audio":
                return (
                    <div className="flex items-center gap-2">
                        <Mic className="h-3 w-3" />
                        <span>Voice message</span>
                        {duration && <span>{formatTime(duration)}</span>}
                    </div>
                )
            case "video":
                return "🎥 Video"
            case "file":
                return `📄 ${fileName || "Document"}`
            default:
                return content.length > 50 ? content.substring(0, 50) + "..." : content
        }
    }

    return (
        <div
            className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-l-4 border-primary cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={onClick}
        >
            {/* Barre verticale de couleur (déjà gérée par border-l-4) */}
            <div className="flex-1 min-w-0">
                {/* Nom de l'expéditeur */}
                <div className="text-xs font-semibold text-primary mb-0.5 truncate">
                    {sender}
                </div>
                {/* Contenu du message */}
                <div className="text-sm text-muted-foreground truncate">
                    {getPreviewContent()}
                </div>
            </div>

            {/* Bouton de fermeture */}
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 hover:bg-background"
                onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                }}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}