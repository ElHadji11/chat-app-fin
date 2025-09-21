import { auth } from "@clerk/nextjs/server"
import { preloadQuery } from "convex/nextjs"
import ChatLayoutWrapper from "./_components/chat-layout-wrapper"
import { api } from "../../../convex/_generated/api"

export default async function ChatLayout({ children }: {
    children: React.ReactNode
}) {
    const { userId } = await auth()

    // user information
    const preloadedUserInfo = await preloadQuery(api.users.readUser, {
        clerkId: userId!
    })
    // conversations + chats
    const preloadedConversations = await preloadQuery(api.chats.getConversation, {
        userId: userId!
    })

    // preloaded chat

    return (
        <ChatLayoutWrapper
            preloadedUserInfo={preloadedUserInfo}
            preloadedConversations={preloadedConversations}
        >
            {children}
        </ChatLayoutWrapper>
    )
}