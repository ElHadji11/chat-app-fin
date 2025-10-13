"use client"

import type React from "react"
import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    FileText,
    Mic,
    Paperclip,
    Pause,
    Play,
    Send,
    Trash2,
    Video,
    X,
    Smile
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Waveform } from "./waveform"
import type { Message as MessageType } from "./message-bubble"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { EmojiPicker } from "./emoji-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ReplyPreviewBar } from "./reply-preview-bar"

// 🔧 FIX 1: Définir le type FileType (aligné avec le schéma Convex)
interface FileType {
    id: string
    name: string
    type: "image" | "video" | "audio" | "file" // ✅ Changé "document" en "file"
    url: string
    size: number
    file?: File
}

interface FormInputs {
    message: string
}

export default function ChatForm({
    conversationId,
    userId,
    replyTo,
    onCancelReply,
    onScrollToMessage,
    initialDraft,
    onTypingStart,
    onTypingStop,
    onDraftUpdate,
}: {
    conversationId: string
    userId: string
    replyTo: MessageType | null
    onCancelReply: () => void
    onScrollToMessage: (messageId: string) => void
    initialDraft: string
    onTypingStart: () => Promise<void>
    onTypingStop: () => Promise<void>
    onDraftUpdate: (content: string) => Promise<void>
}) {
    const { register, handleSubmit, watch, reset, setValue } = useForm<FormInputs>({
        defaultValues: {
            message: initialDraft
        }
    })
    const [attachments, setAttachments] = useState<FileType[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [voiceMode, setVoiceMode] = useState<"idle" | "recording" | "review">("idle")
    const [isPlayingPreview, setIsPlayingPreview] = useState(false)
    const [previewTime, setPreviewTime] = useState(0)
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isTypingRef = useRef(false)
    const previousMessageRef = useRef<string>("")
    const hasLoadedInitialDraft = useRef(false)

    const sendMessage = useMutation(api.chats.sendMessage)
    const generateUploadUrl = useMutation(api.chats.generateUploadUrl)

    const {
        isRecording,
        recordingTime,
        audioUrl,
        waveformData,
        liveWaveformData,
        startRecording,
        stopRecording,
        cancelRecording,
    } = useAudioRecorder()

    // 🔧 FIX 2: Implémentation complète de toutes les fonctions

    const handleStartRecording = async () => {
        try {
            await startRecording()
            setVoiceMode("recording")
        } catch (error) {
            console.error("Failed to start recording:", error)
            toast.error("Impossible de démarrer l'enregistrement")
        }
    }

    const handleStopRecording = () => {
        if (isRecording) {
            stopRecording()
            setVoiceMode("review")
        }
    }

    const handleCancelVoice = () => {
        cancelRecording()
        setVoiceMode("idle")
        setIsPlayingPreview(false)
        setPreviewTime(0)
        if (audioPreviewRef.current) {
            audioPreviewRef.current.pause()
            audioPreviewRef.current.currentTime = 0
        }
    }

    const handleSendVoice = async () => {
        if (!audioUrl) {
            toast.error("Aucun enregistrement audio disponible")
            return
        }

        try {
            setIsUploading(true)

            // Récupérer le blob audio
            const response = await fetch(audioUrl)
            const blob = await response.blob()

            // Obtenir l'URL d'upload
            const uploadUrl = await generateUploadUrl()

            // Upload le fichier
            const uploadResponse = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": blob.type },
                body: blob,
            })

            const { storageId } = await uploadResponse.json()

            // Envoyer le message
            await sendMessage({
                conversationId: conversationId as Id<"conversations">,
                content: "🎤 Message vocal",
                senderId: userId,
                type: "audio",
                mediaUrl: storageId,
                duration: recordingTime,
                waveformData: waveformData,
                replyTo: replyTo?.id as Id<"messages"> | undefined,
            })

            // Réinitialiser
            handleCancelVoice()
            // toast.success("Message vocal envoyé")
            onCancelReply()
        } catch (error) {
            console.error("Error sending voice message:", error)
            toast.error("Erreur lors de l'envoi du message vocal")
        } finally {
            setIsUploading(false)
        }
    }

    const toggleVoicePreview = () => {
        if (!audioPreviewRef.current) return

        if (isPlayingPreview) {
            audioPreviewRef.current.pause()
            setIsPlayingPreview(false)
        } else {
            audioPreviewRef.current.play()
            setIsPlayingPreview(true)
        }
    }

    const handleVoiceSeek = (progress: number) => {
        if (!audioPreviewRef.current) return

        const newTime = progress * recordingTime
        audioPreviewRef.current.currentTime = newTime
        setPreviewTime(newTime)
    }

    const onSubmit = async (data: FormInputs) => {
        if (!data.message.trim() && attachments.length === 0) {
            return
        }

        try {
            setIsUploading(true)

            // Envoyer les pièces jointes en premier
            if (attachments.length > 0) {
                for (const attachment of attachments) {
                    await sendMessage({
                        conversationId: conversationId as Id<"conversations">,
                        content: attachment.name,
                        senderId: userId,
                        type: attachment.type,
                        mediaUrl: attachment.url,
                        replyTo: replyTo?.id as Id<"messages"> | undefined,
                    })
                }
                setAttachments([])
            }

            // Envoyer le message texte
            if (data.message.trim()) {
                await sendMessage({
                    conversationId: conversationId as Id<"conversations">,
                    content: data.message,
                    senderId: userId,
                    type: "text",
                    replyTo: replyTo?.id as Id<"messages"> | undefined,
                })
            }

            // Clear draft after sending message
            await onDraftUpdate("")
            reset()
            onCancelReply()
            toast.success("Message envoyé")
        } catch (error) {
            console.error("Error sending message:", error)
            toast.error("Erreur lors de l'envoi du message")
        } finally {
            setIsUploading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        try {
            setIsUploading(true)

            for (const file of Array.from(files)) {
                // Vérifier la taille du fichier (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    toast.error(`${file.name} est trop volumineux (max 10MB)`)
                    continue
                }

                // Obtenir l'URL d'upload
                const uploadUrl = await generateUploadUrl()

                // Upload le fichier
                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": file.type },
                    body: file,
                })

                const { storageId } = await uploadResponse.json()

                // Déterminer le type de fichier
                let fileType: FileType["type"] = "file" // ✅ Changé "document" en "file"
                if (file.type.startsWith("image/")) fileType = "image"
                else if (file.type.startsWith("video/")) fileType = "video"
                else if (file.type.startsWith("audio/")) fileType = "audio"

                // Ajouter aux pièces jointes
                setAttachments((prev) => [
                    ...prev,
                    {
                        id: storageId,
                        name: file.name,
                        type: fileType,
                        url: storageId,
                        size: file.size,
                        file,
                    },
                ])
            }

            toast.success("Fichier(s) ajouté(s)")
        } catch (error) {
            console.error("Error uploading file:", error)
            toast.error("Erreur lors de l'upload du fichier")
        } finally {
            setIsUploading(false)
            // Réinitialiser l'input
            e.target.value = ""
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const handleEmojiSelect = (emoji: string) => {
        const currentMessage = watch("message") || ""
        setValue("message", currentMessage + emoji)
    }

    // 🔧 FIX 3: Effet pour gérer l'audio preview
    useEffect(() => {
        if (audioUrl && voiceMode === "review") {
            const audio = new Audio(audioUrl)
            audioPreviewRef.current = audio

            audio.addEventListener("timeupdate", () => {
                setPreviewTime(audio.currentTime)
            })

            audio.addEventListener("ended", () => {
                setIsPlayingPreview(false)
                setPreviewTime(0)
            })

            return () => {
                audio.pause()
                audio.removeEventListener("timeupdate", () => { })
                audio.removeEventListener("ended", () => { })
            }
        }
    }, [audioUrl, voiceMode])

    // ✅ FIX 4: Effect to load initial draft ONLY on mount
    useEffect(() => {
        if (!hasLoadedInitialDraft.current && initialDraft) {
            setValue("message", initialDraft)
            previousMessageRef.current = initialDraft
            hasLoadedInitialDraft.current = true
        }
    }, [initialDraft, setValue])

    // ✅ FIX 5: Effect to handle typing indicator and draft updates
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            if (name === "message") {
                const messageValue = value.message || ""

                // Only update if message actually changed
                if (messageValue === previousMessageRef.current) {
                    return
                }
                previousMessageRef.current = messageValue

                // Handle draft update
                onDraftUpdate(messageValue)

                // Handle typing indicator
                if (messageValue.length > 0) {
                    // User is typing
                    if (!isTypingRef.current) {
                        isTypingRef.current = true
                        onTypingStart()
                    }

                    // Clear existing timeout
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                    }

                    // Set new timeout to stop typing after 1 second of inactivity
                    typingTimeoutRef.current = setTimeout(() => {
                        if (isTypingRef.current) {
                            isTypingRef.current = false
                            onTypingStop()
                        }
                    }, 1000)
                } else {
                    // Message is empty, stop typing
                    if (isTypingRef.current) {
                        isTypingRef.current = false
                        onTypingStop()
                    }
                    if (typingTimeoutRef.current) {
                        clearTimeout(typingTimeoutRef.current)
                    }
                }
            }
        })

        return () => {
            subscription.unsubscribe()
            // Clean up typing state when component unmounts
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            if (isTypingRef.current) {
                isTypingRef.current = false
                onTypingStop()
            }
        }
    }, [onDraftUpdate, onTypingStart, onTypingStop])

    return (
        <div className="border-t border-border bg-card">
            {/* ✅ ReplyPreviewBar toujours affichée si replyTo existe */}
            {replyTo && (
                <ReplyPreviewBar
                    sender={replyTo.senderName}
                    content={replyTo.content}
                    type={replyTo.type as "text" | "audio" | "video" | "file"}
                    duration={replyTo.duration}
                    fileName={replyTo.fileName}
                    onClose={onCancelReply}
                    onClick={() => onScrollToMessage(replyTo.id)}
                />
            )}

            {/* ✅ Affichage des pièces jointes - toujours visible si présentes */}
            {attachments.length > 0 && voiceMode === "idle" && (
                <div className="px-4 pt-4 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="relative flex items-center gap-2 bg-secondary rounded-lg px-3 py-2"
                        >
                            {attachment.type === "image" && <FileText className="h-4 w-4" />}
                            {attachment.type === "video" && <Video className="h-4 w-4" />}
                            {attachment.type === "audio" && <Mic className="h-4 w-4" />}
                            {attachment.type === "file" && <FileText className="h-4 w-4" />}
                            <span className="text-sm truncate max-w-[150px]">
                                {attachment.name}
                            </span>
                            <button
                                onClick={() =>
                                    setAttachments((prev) =>
                                        prev.filter((a) => a.id !== attachment.id)
                                    )
                                }
                                className="text-destructive hover:text-destructive/80"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ✅ Zone de saisie - TOUJOURS présente */}
            <div className="p-4 flex items-center gap-3">
                {/* MODE IDLE: Formulaire normal */}
                {voiceMode === "idle" && (
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex items-center gap-3 w-full"
                    >
                        {/* Bouton pièce jointe */}
                        <div className="relative">
                            <label
                                htmlFor="file-upload"
                                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10"
                            >
                                <Paperclip className="w-5 h-5" />
                            </label>
                            <input
                                id="file-upload"
                                type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                multiple
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                            />
                        </div>

                        {/* Bouton emoji */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                >
                                    <Smile className="h-5 w-5" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start" side="top">
                                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                            </PopoverContent>
                        </Popover>

                        {/* Champ de texte */}
                        <Input
                            {...register("message")}
                            placeholder={isUploading ? "Uploading..." : "Type a message"}
                            className="flex-1 bg-secondary border-none placeholder:text-muted-foreground"
                            disabled={isUploading}
                        />

                        {/* Bouton Mic ou Send */}
                        {!watch("message") && attachments.length === 0 ? (
                            <Button
                                type="button"
                                size="icon"
                                onClick={handleStartRecording}
                                className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10 shrink-0"
                            >
                                <Mic className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={
                                    isUploading ||
                                    (!watch("message") && attachments.length === 0)
                                }
                                className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10 shrink-0"
                            >
                                <Send className="h-5 w-5" />
                            </Button>
                        )}
                    </form>
                )}

                {/* MODE RECORDING: Enregistrement en cours */}
                {voiceMode === "recording" && (
                    <div className="flex items-center gap-3 w-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={handleCancelVoice}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 h-12 bg-secondary rounded-lg overflow-hidden">
                                <Waveform
                                    data={liveWaveformData}
                                    isLive
                                    color="hsl(var(--primary))"
                                />
                            </div>
                            <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">
                                {formatTime(recordingTime)}
                            </span>
                        </div>
                        <Button
                            size="icon"
                            className="rounded-full bg-primary hover:bg-primary/90 h-11 w-11 shrink-0"
                            onClick={handleStopRecording}
                        >
                            <Mic className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* MODE REVIEW: Prévisualisation */}
                {voiceMode === "review" && (
                    <div className="flex items-center gap-3 w-full">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleVoicePreview}
                            className="shrink-0"
                        >
                            {isPlayingPreview ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5" />
                            )}
                        </Button>
                        <div className="flex-1 h-12 bg-secondary rounded-lg overflow-hidden cursor-pointer">
                            <Waveform
                                data={waveformData}
                                progress={previewTime / recordingTime}
                                onSeek={handleVoiceSeek}
                                color="hsl(var(--primary))"
                            />
                        </div>
                        <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">
                            {formatTime(recordingTime)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelVoice}
                            className="text-destructive hover:text-destructive shrink-0"
                        >
                            <Trash2 className="h-5 w-5" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={handleSendVoice}
                            disabled={isUploading}
                            className="rounded-full bg-primary hover:bg-primary/90 h-11 w-11 shrink-0"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}