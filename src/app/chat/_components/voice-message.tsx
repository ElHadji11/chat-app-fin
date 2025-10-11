"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { Waveform } from "./waveform"

interface VoiceMessageProps {
    audioUrl: string
    waveformData: number[]
    duration: number
}

export function VoiceMessage({ audioUrl, waveformData, duration }: VoiceMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)

    useEffect(() => {
        const audio = new Audio(audioUrl)
        audioRef.current = audio;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl])

    const togglePlayback = () => {
        if (isPlaying) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    }

    const handleSeek = (progress: number) => {
        if (!audioRef.current) return;
        const newTime = progress * duration;
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return (
        <div className="flex items-center gap-2 w-64">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={togglePlayback} className="shrink-0 h-10 w-10 rounded-full">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <div className="flex-1 h-12 bg-waveform-bg rounded-lg overflow-hidden cursor-pointer">
                    <Waveform
                        data={waveformData}
                        progress={currentTime / duration}
                        onSeek={handleSeek}
                        color="var(--color-waveform)"
                    />
                </div>

                <span className="text-xs font-mono text-muted-foreground min-w-[2.5rem]">{formatTime(duration)}</span>
            </div>
        </div>
    )
}
