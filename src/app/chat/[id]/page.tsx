import { auth, currentUser } from "@clerk/nextjs/server"
import { preloadQuery } from "convex/nextjs"
import ChatList from "../_components/chat-list"
import FormChat from "../_components/form"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { redirect } from "next/navigation"

export default async function Conversations({ params }: { params: Promise<{ id: string }> }) {

    const conversationId = (await params).id
    const { userId } = await auth()

    if (!userId) { redirect(`/sign-in`) }

    const preloadedConversationInfo = await preloadQuery(api.chats.getConversationInfo, {
        conversationId: conversationId as Id<"conversations">,
        userId
    })

    const preloadedMessages = await preloadQuery(api.chats.getMessages, {
        conversationId: conversationId as Id<"conversations">,
        userId
    })

    return (
        <div className="h-screen flex flex-col w-full">
            <div className="flex-1 flex flex-col overflow-hidden">
                <ChatList
                    userId={userId!}
                    preloadedMessages={preloadedMessages}
                    preloadedConversationInfo={preloadedConversationInfo}
                />
                <FormChat
                    userId={userId!}
                    conversationId={conversationId}
                    preloadedConversationInfo={preloadedConversationInfo} />
            </div>
        </div>
    )
}