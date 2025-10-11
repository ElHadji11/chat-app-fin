"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [audioUrl, setAudioUrl] = useState<string>("")
    const [waveformData, setWaveformData] = useState<number[]>([])
    const [liveWaveformData, setLiveWaveformData] = useState<number[]>([])

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animationFrameRef = useRef<number | null>(null)

    const startRecording = useCallback(async () => {
        try {
            //demande à l'utilisateur l'autorisation d'utiliser son micro.
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

            audioContextRef.current = new AudioContext()
            const source = audioContextRef.current.createMediaStreamSource(stream)
            analyserRef.current = audioContextRef.current.createAnalyser()
            analyserRef.current.fftSize = 128
            source.connect(analyserRef.current)

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
                const url = URL.createObjectURL(audioBlob)
                setAudioUrl(url)

                generateWaveform(audioBlob)

                stream.getTracks().forEach((track) => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
            setRecordingTime(0)

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)

            updateLiveWaveform()
        } catch (error) {
            console.error("Error starting recording:", error)
        }
    }, [])

    const updateLiveWaveform = useCallback(() => {
        if (!analyserRef.current) return

        const bufferLength = analyserRef.current.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyserRef.current.getByteFrequencyData(dataArray)

        const bars = 40
        const step = Math.floor(bufferLength / bars)
        const normalized = []

        for (let i = 0; i < bars; i++) {
            const value = dataArray[i * step] / 255
            normalized.push(Math.max(value, 0.1))
        }

        setLiveWaveformData(normalized)

        animationFrameRef.current = requestAnimationFrame(updateLiveWaveform)
    }, [])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)

            if (timerRef.current) {
                clearInterval(timerRef.current)
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                audioContextRef.current.close()
            }
        }
    }, [isRecording])

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setRecordingTime(0)
            setAudioUrl("")
            setWaveformData([])
            setLiveWaveformData([])
            audioChunksRef.current = []

            if (timerRef.current) {
                clearInterval(timerRef.current)
            }

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }

            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                audioContextRef.current.close()
            }
        }
    }, [])

    const generateWaveform = async (audioBlob: Blob) => {
        try {
            const audioContext = new AudioContext()
            const arrayBuffer = await audioBlob.arrayBuffer()
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

            const rawData = audioBuffer.getChannelData(0)
            const samples = 60
            const blockSize = Math.floor(rawData.length / samples)
            const filteredData = []

            for (let i = 0; i < samples; i++) {
                const blockStart = blockSize * i
                let sum = 0
                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(rawData[blockStart + j])
                }
                filteredData.push(sum / blockSize)
            }

            const max = Math.max(...filteredData)
            const normalized = filteredData.map((val) => val / max)

            setWaveformData(normalized)
            audioContext.close()
        } catch (error) {
            console.error("Error generating waveform:", error)
            setWaveformData(Array.from({ length: 60 }, () => Math.random()))
        }
    }

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (audioContextRef.current && audioContextRef.current.state !== "closed") {
                audioContextRef.current.close()
            }
        }
    }, [])

    return {
        isRecording,
        recordingTime,
        audioUrl,
        waveformData,
        liveWaveformData,
        startRecording,
        stopRecording,
        cancelRecording,
    }
}
