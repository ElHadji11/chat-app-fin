"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, Send, Trash2, Play, Pause, X } from "lucide-react"
import { Waveform } from "./waveform"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"

interface VoiceInputProps {
    onSendVoice: (audioUrl: string, waveformData: number[], duration: number) => void
}

export function VoiceInput({ onSendVoice }: VoiceInputProps) {
    const [mode, setMode] = useState<"idle" | "recording" | "review">("idle")
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

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

    const handleMouseDown = async () => {
        await startRecording()
        setMode("recording")
    }

    const handleMouseUp = () => {
        if (isRecording) {
            stopRecording()
            setMode("review")
        }
    }

    const handleCancel = () => {
        cancelRecording()
        setMode("idle")
        setIsPlaying(false)
        setCurrentTime(0)
    }

    const handleSend = () => {
        if (audioUrl && waveformData.length > 0) {
            onSendVoice(audioUrl, waveformData, recordingTime)
            setMode("idle")
            setIsPlaying(false)
            setCurrentTime(0)
        }
    }

    const togglePlayback = () => {
        if (!audioRef.current) return

        if (isPlaying) {
            audioRef.current.pause()
        } else {
            audioRef.current.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (progress: number) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = progress * recordingTime
        setCurrentTime(audioRef.current.currentTime)
    }

    useEffect(() => {
        if (audioUrl && mode === "review") {
            audioRef.current = new Audio(audioUrl)
            audioRef.current.addEventListener("timeupdate", () => {
                setCurrentTime(audioRef.current?.currentTime || 0)
            })
            audioRef.current.addEventListener("ended", () => {
                setIsPlaying(false)
                setCurrentTime(0)
            })
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [audioUrl, mode])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    if (mode === "recording") {
        return (
            <div className="border-t border-border p-4 bg-card">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onMouseUp={handleCancel}
                    >
                        <X className="h-5 w-5" />
                    </Button>

                    <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 h-16 bg-waveform-bg rounded-lg overflow-hidden">
                            <Waveform data={liveWaveformData} isLive color="var(--color-waveform)" />
                        </div>
                        <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{formatTime(recordingTime)}</span>
                    </div>

                    <Button
                        size="icon"
                        className="rounded-full bg-primary hover:bg-primary/90 h-12 w-12"
                        onMouseUp={handleMouseUp}
                    >
                        <Mic className="h-5 w-5" />
                    </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">Release to review • Slide left to cancel</p>
            </div>
        )
    }

    if (mode === "review") {
        return (
            <div className="border-t border-border p-4 bg-card">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={togglePlayback} className="shrink-0">
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>

                    <div className="flex-1 h-16 bg-waveform-bg rounded-lg overflow-hidden cursor-pointer">
                        <Waveform
                            data={waveformData}
                            progress={currentTime / recordingTime}
                            onSeek={handleSeek}
                            color="var(--color-waveform)"
                        />
                    </div>

                    <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">{formatTime(recordingTime)}</span>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        className="text-destructive hover:text-destructive shrink-0"
                    >
                        <Trash2 className="h-5 w-5" />
                    </Button>

                    <Button
                        size="icon"
                        onClick={handleSend}
                        className="rounded-full bg-primary hover:bg-primary/90 h-12 w-12 shrink-0"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        )
    }

    // Sinon (mode === "idle")
    return (
        <div className="border-t border-border p-4 bg-card">
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Enter Message"
                    className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                    size="icon"
                    className="rounded-full bg-primary hover:bg-primary/90 h-12 w-12"
                    onMouseDown={handleMouseDown}
                >
                    <Mic className="h-5 w-5" />
                </Button>
            </div>
        </div>
    )
}
