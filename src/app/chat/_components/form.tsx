"use client"

import type React from "react"

import { useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { fetchMutation } from "convex/nextjs"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Mic, Paperclip, Pause, Play, Send, Trash2, Video, X, Smile } from "lucide-react"
import { Preloaded } from "convex/react"
import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Waveform } from "./waveform"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { EmojiPicker } from "./emoji-picker"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"


interface FormInputs {
    message: string
}

interface Attachment {
    url: string
    type: "image" | "video" | "document" | "audio"
    name?: string
    thumbnail?: string
}

export default function ChatForm({
    conversationId,
    userId,
}: {
    conversationId: string
    userId: string
    preloadedConversationInfo: Preloaded<typeof api.chats.getConversationInfo>
}) {

    const { register, handleSubmit, watch, reset, setValue } = useForm<FormInputs>()

    const [attachments, setAttachments] = useState<Attachment[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [voiceMode, setVoiceMode] = useState<"idle" | "recording" | "review">("idle")
    const [isPlayingPreview, setIsPlayingPreview] = useState(false)
    const [previewTime, setPreviewTime] = useState(0)
    const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

    const sendMessage = useMutation(api.chats.sendMessage)


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

    const handleStartRecording = async () => {
        await startRecording()
        setVoiceMode("recording")
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
    }

    const handleSendVoice = async () => {
        if (audioUrl && waveformData.length > 0) {
            try {
                setIsUploading(true);
                const response = await fetch(audioUrl)
                const blob = await response.blob()
                // const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" })

                // Logique d'upload Convex (similaire à votre ancien handleImageUpload)
                const postUrl = await fetchMutation(api.chats.generateUploadUrl);
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": "audio/webm" },
                    body: blob,
                });
                const { storageId } = await result.json();
                const url = await fetchMutation(api.chats.getUploadUrl, { storageId });

                if (url) {
                    // VÉRIFIEZ L'OBJET DANS CETTE CONSOLE !
                    const messagePayload = {
                        conversationId: conversationId as Id<"conversations">,
                        senderId: userId,
                        type: "audio" as const, // "as const" est une bonne pratique
                        content: "Voice message",
                        mediaUrl: url,
                        duration: recordingTime,
                        waveformData: waveformData,
                    };

                    console.log("Sending this payload to Convex:", messagePayload);

                    await sendMessage(messagePayload); // Envoyer l'objet que nous venons de vérifier
                }

                toast.success("Voice message sent! (Demo mode)")
                handleCancelVoice();
            } catch (error) {
                console.error("Failed to send voice message:", error)
                toast.error("Failed to send voice message. Please try again.")
            } finally {
                setIsUploading(false)
            }
        }
    }

    const toggleVoicePreview = () => {
        if (!audioPreviewRef.current) return

        if (isPlayingPreview) {
            audioPreviewRef.current.pause()
        } else {
            audioPreviewRef.current.play()
        }
        setIsPlayingPreview(!isPlayingPreview)
    }

    const handleVoiceSeek = (progress: number) => {
        if (!audioPreviewRef.current) return
        audioPreviewRef.current.currentTime = progress * recordingTime
        setPreviewTime(audioPreviewRef.current.currentTime)
    }

    useEffect(() => {
        if (audioUrl && voiceMode === "review") {
            audioPreviewRef.current = new Audio(audioUrl)
            audioPreviewRef.current.addEventListener("timeupdate", () => {
                setPreviewTime(audioPreviewRef.current?.currentTime || 0)
            })
            audioPreviewRef.current.addEventListener("ended", () => {
                setIsPlayingPreview(false)
                setPreviewTime(0)
            })
        }

        return () => {
            if (audioPreviewRef.current) {
                audioPreviewRef.current.pause()
                audioPreviewRef.current = null
            }
        }
    }, [audioUrl, voiceMode])

    const onSubmit = async (data: FormInputs) => {
        if (!data.message.trim()) return;
        try {
            await sendMessage({
                conversationId: conversationId as Id<"conversations">,
                senderId: userId,
                type: "text",
                content: data.message,
            });
            reset();
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error("Failed to send message.");
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setIsUploading(true)

            const postUrl = await fetchMutation(api.chats.generateUploadUrl);
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            const { storageId } = await result.json();
            const url = await fetchMutation(api.chats.getUploadUrl, { storageId });


            if (url) {
                let type: "image" | "video" | "file" = "file";
                if (file.type.startsWith("image/")) type = "image";
                else if (file.type.startsWith("video/")) type = "video";

                // Envoyez directement le fichier comme un message
                await sendMessage({
                    conversationId: conversationId as Id<"conversations">,
                    senderId: userId,
                    type: type,
                    content: file.name, // Le nom du fichier comme contenu
                    mediaUrl: url,
                    fileName: file.name
                });
                toast.success(`${file.name} sent!`);
            }
        } catch (error) {
            console.error("Upload failed:", error)
            toast.error("Failed to upload file. Please try again.")
        } finally {
            setIsUploading(false)
            e.target.value = ""// Permet de re-sélectionner le même fichier
        }
    }

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index))
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

    if (voiceMode === "recording") {
        return (
            <div className="border-t border-border bg-card p-4">
                <div className="flex items-center gap-3">
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
                            <Waveform data={liveWaveformData} isLive color="hsl(var(--primary))" />
                        </div>
                        <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{formatTime(recordingTime)}</span>
                    </div>

                    <Button
                        size="icon"
                        className="rounded-full bg-primary hover:bg-primary/90 h-11 w-11 shrink-0"
                        onClick={handleStopRecording}
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">Click mic to stop recording</p>
            </div>
        )
    }

    if (voiceMode === "review") {
        return (
            <div className="border-t border-border bg-card p-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={toggleVoicePreview} className="shrink-0">
                        {isPlayingPreview ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>

                    <div className="flex-1 h-12 bg-secondary rounded-lg overflow-hidden cursor-pointer">
                        <Waveform
                            data={waveformData}
                            progress={previewTime / recordingTime}
                            onSeek={handleVoiceSeek}
                            color="hsl(var(--primary))"
                        />
                    </div>

                    <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{formatTime(recordingTime)}</span>

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
            </div>
        )
    }

    return (
        <div className="border-t border-border bg-card">
            {attachments.length > 0 && (
                <div className="p-3 flex gap-2 flex-wrap border-b border-border">
                    {attachments.map((attachment, index) => (
                        <div key={index} className="relative group">
                            {attachment.type === "image" && (
                                <img
                                    src={attachment.url || "/placeholder.svg"}
                                    alt="attachment"
                                    className="h-20 w-20 object-cover rounded-lg border border-border"
                                />
                            )}
                            {attachment.type === "video" && (
                                <div className="h-20 w-20 bg-secondary rounded-lg border border-border flex items-center justify-center">
                                    <Video className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            {attachment.type === "document" && (
                                <div className="h-20 w-20 bg-secondary rounded-lg border border-border flex flex-col items-center justify-center p-2">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                                        {attachment.name?.split(".").pop()?.toUpperCase()}
                                    </span>
                                </div>
                            )}
                            {attachment.type === "audio" && (
                                <div className="h-20 w-20 bg-secondary rounded-lg border border-border flex items-center justify-center">
                                    <Mic className="h-8 w-8 text-muted-foreground" />
                                </div>
                            )}
                            <button
                                onClick={() => removeAttachment(index)}
                                className="absolute -top-1.5 -right-1.5 bg-destructive rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            >
                                <X className="h-3.5 w-3.5 text-destructive-foreground" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="p-4 flex items-center gap-3">
                <div className="relative">
                    <label
                        htmlFor="file-upload"
                        className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium
            transition-colors hover:bg-accent hover:text-accent-foreground h-10 w-10"
                    >
                        <Paperclip className="w-5 h-5" />
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                            <Smile className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start" side="top">
                        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                    </PopoverContent>
                </Popover>

                <Input
                    {...register("message")}
                    placeholder={isUploading ? "Uploading..." : "Type a message"}
                    className="flex-1 bg-secondary border-none placeholder:text-muted-foreground"
                />

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
                        disabled={isUploading || (!attachments.length && !watch("message"))}
                        className="rounded-full bg-primary hover:bg-primary/90 h-10 w-10 shrink-0"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                )}
            </form>
        </div>
    )
}
