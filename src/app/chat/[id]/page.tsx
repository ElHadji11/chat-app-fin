import { auth } from "@clerk/nextjs/server"
import { preloadQuery } from "convex/nextjs"
import { api } from "../../../../convex/_generated/api"
import { redirect } from "next/navigation"
import type { Id } from "../../../../convex/_generated/dataModel"
import ChatPageClient from "../_components/chat-page-client"

export default async function Conversations({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const conversationId = (await params).id
    const { userId } = await auth()

    if (!userId) {
        redirect(`/sign-in`)
    }

    const preloadedConversationInfo = await preloadQuery(
        api.chats.getConversationInfo,
        {
            conversationId: conversationId as Id<"conversations">,
            userId
        }
    )

    const preloadedMessages = await preloadQuery(
        api.chats.getMessages,
        {
            conversationId: conversationId as Id<"conversations">,
            userId
        }
    )

    return (
        <ChatPageClient
            userId={userId}
            conversationId={conversationId}
            preloadedMessages={preloadedMessages}
        />
    )
}