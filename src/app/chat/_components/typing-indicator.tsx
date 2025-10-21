"use client"

import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
    // userNames?: string[]
    isVisible: boolean
}

export function TypingIndicator({
    //  userNames = [],
    isVisible }: TypingIndicatorProps) {
    // const displayText =
    //     userNames.length === 0
    //         ? "Someone is typing..."
    //         : userNames.length === 1
    //             ? `${userNames[0]} is typing...`
    //             : "Multiple people are typing..."

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 px-4 py-2"
                >
                    <div className="flex items-center gap-1 bg-secondary px-3 py-2 rounded-2xl">
                        <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                        />
                        <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: 0.2 }}
                        />
                        <motion.div
                            className="w-2 h-2 bg-primary rounded-full"
                            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, delay: 0.4 }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
