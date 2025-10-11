"use client"

import type React from "react"
import { useEffect, useRef } from "react"

interface WaveformProps {
    data: number[]
    progress?: number
    isLive?: boolean
    onSeek?: (progress: number) => void
    color?: string
}

export function Waveform({ data, progress = 0, isLive = false, onSeek, color = "#8b5cf6" }: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        ctx.scale(dpr, dpr)

        ctx.clearRect(0, 0, rect.width, rect.height)

        if (data.length === 0) return

        const barWidth = rect.width / data.length
        const barGap = barWidth * 0.3
        const actualBarWidth = barWidth - barGap

        data.forEach((value, index) => {
            const barHeight = Math.max(value * rect.height * 0.8, 2)
            const x = index * barWidth
            const y = (rect.height - barHeight) / 2

            if (progress > 0 && index / data.length <= progress) {
                ctx.fillStyle = color
            } else {
                ctx.fillStyle = isLive ? color : "hsl(var(--muted))"
                ctx.globalAlpha = isLive ? 0.6 : 0.3
            }

            ctx.fillRect(x, y, actualBarWidth, barHeight)
            ctx.globalAlpha = 1
        })
    }, [data, progress, isLive, color])

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!onSeek) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const progress = x / rect.width

        onSeek(Math.max(0, Math.min(1, progress)))
    }

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            onClick={handleClick}
            style={{ cursor: onSeek ? "pointer" : "default" }}
        />
    )
}
