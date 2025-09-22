import { AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@clerk/nextjs"
import { Avatar } from "@radix-ui/react-avatar"
import { Preloaded, usePreloadedQuery, useMutation } from "convex/react"
import { MoreVertical, Search, Users2, Mail } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { api } from "../../../../convex/_generated/api"
import SearchComponent from "./search"

interface SideBarProps {
    preloadedUserInfo: Preloaded<typeof api.users.readUser>;
    preloadedConversations: Preloaded<typeof api.chats.getConversation>;
}

type FilterType = 'all' | 'unread'

export default function Sidebar({ preloadedUserInfo, preloadedConversations }: SideBarProps) {
    const pathname = usePathname()
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState<FilterType>('all')
    const { signOut, userId } = useAuth()
    const router = useRouter()
    const userInfo = usePreloadedQuery(preloadedUserInfo)
    const conversations = usePreloadedQuery(preloadedConversations)
    const markAsRead = useMutation(api.chats.markMessagesAsRead)

    // Obtenir l'ID de la conversation actuelle
    const currentConversationId = pathname.split("/")?.[2]

    // Marquer les messages comme lus quand on change de conversation
    useEffect(() => {
        if (currentConversationId && userId) {
            markAsRead({
                conversationId: currentConversationId as any,
                userId: userId
            }).catch(console.error)
        }
    }, [currentConversationId, userId, markAsRead])

    // Calculer le total des messages non lus
    // const totalUnreadCount = useMemo(() => {
    //     return conversations?.reduce((total, chat) => {
    //         const isCurrentConversation = currentConversationId === chat.id;
    //         return total + (isCurrentConversation ? 0 : (chat.unread || 0));
    //     }, 0) || 0;
    // }, [conversations, currentConversationId])

    const filteredConversations = useMemo(() => {
        let result = conversations || [];

        // Filtrer par statut de lecture
        if (filter === 'unread') {
            result = result.filter(chat => chat.unread > 0);
        }

        // Filtrer par recherche
        if (searchQuery) {
            result = result.filter((chat) => {
                const matchesName = chat.name.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesMessage = chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
                return matchesName || matchesMessage
            })

            // Trier les résultats de recherche
            result.sort((a, b) => {
                const aNameMatch = a.name.toLowerCase().includes(searchQuery.toLowerCase())
                const bNameMatch = b.name.toLowerCase().includes(searchQuery.toLowerCase())

                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1

                // Si même priorité de recherche, trier par date du dernier message
                return 0;
            })
        }

        return result;
    }, [searchQuery, conversations, filter])

    // Compter les conversations par statut
    const unreadChatsCount = conversations?.filter(chat => chat.unread > 0).length || 0;

    return (
        <div className="w-[70px] md:w-[380px] lg:w-1/4 h-screen flex flex-col bg-background dark:bg-[#111B21] border-r border-border dark:border-[#313D45]">
            {/* Header */}
            <div className="shrink-0 px-3 py-[18px] md:py-[14px] bg-muted dark:bg-[#202C33] flex justify-center md:justify-between items-center">
                <div className="relative">
                    <Link href="/profile">
                        <Avatar>
                            <AvatarImage className="w-8 h-8 md:w-9 md:h-9 rounded-full" src={userInfo?.image} alt="Your avatar" />
                        </Avatar>
                    </Link>
                </div>
                <div className="hidden md:flex justify-center items-center gap-2">
                    <SearchComponent onSidebar={true} />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => {
                                signOut()
                                router.push("/")
                            }}>Log out</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Search Input */}
            <div className="hidden md:block p-2 bg-[#111B21]">
                <div className="relative bg-[#202C33] rounded-lg flex items-center">
                    <div className="pl-4 pr-2 py-2">
                        <Search className="h-5 w-5 text-[#8696A0]" />
                    </div>
                    <input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none py-2 text-base"
                    />
                </div>
            </div>

            {/* Filter Buttons - Only All and Unread */}
            <div className="hidden md:block px-2 py-3 bg-[#111B21] border-b border-[#313D45]">
                <div className="flex gap-1 bg-[#202C33] rounded-lg p-1">
                    <Button
                        variant={filter === 'all' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className={`flex-1 text-xs h-8 ${filter === 'all'
                            ? "bg-[#00A884] text-white hover:bg-[#00A884]/90"
                            : "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#2A3942]"
                            }`}
                    >
                        <Mail className="w-3 h-3 mr-1" />
                        All ({conversations?.length || 0})
                    </Button>

                    <Button
                        variant={filter === 'unread' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter('unread')}
                        className={`flex-1 text-xs h-8 relative ${filter === 'unread'
                            ? "bg-blue-500 text-white hover:bg-blue-600"
                            : "text-[#8696A0] hover:text-[#E9EDEF] hover:bg-[#2A3942]"
                            }`}
                    >
                        <Mail className="w-3 h-3 mr-1" />
                        Unread ({unreadChatsCount})
                        {unreadChatsCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                    </Button>
                </div>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-[#8696A0]">
                        <div className="text-center px-4">
                            {filter === 'unread' && (
                                <>
                                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No unread messages</p>
                                </>
                            )}
                            {filter === 'all' && searchQuery && (
                                <>
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No results found</p>
                                </>
                            )}
                            {filter === 'all' && !searchQuery && conversations?.length === 0 && (
                                <>
                                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No conversations yet</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    filteredConversations.map((chat) => {
                        const isCurrentChat = pathname.split("/")?.[2] === chat?.id;
                        const hasUnread = chat.unread > 0 && !isCurrentChat;

                        return (
                            <Link href={`/chat/${chat.id}`} key={chat.id}>
                                <div className={`flex items-center px-2 py-2 md:px-3 md:py-3 hover:bg-[#202C33] cursor-pointer transition-colors
                                    ${isCurrentChat ? "bg-[#202C33]" : ""}
                                    ${hasUnread ? "bg-gradient-to-r from-blue-500/5 to-transparent" : ""}
                                `}>
                                    <div className="relative">
                                        <Avatar>
                                            <AvatarImage className="w-12 h-12 rounded-full" src={chat?.chatImage} />
                                            <AvatarFallback className="bg-[#6B7C85]">
                                                <Users2 className="h-6 w-6 text-[#CFD9DF]" />
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Indicateur de message non lu sur l'avatar */}
                                        {hasUnread && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white animate-pulse"></div>
                                        )}
                                    </div>
                                    {/* Conversation details - Only visible on md and larger screens */}
                                    <div className="hidden md:block flex-1 min-w-0 ml-3">
                                        <div className="flex justify-between items-baseline">
                                            <h2 className={`text-base font-normal truncate transition-colors ${hasUnread ? "text-white font-semibold" : "text-[#E9EDEF]"
                                                }`}>
                                                <HighlightText text={chat.name} searchQuery={searchQuery} />
                                            </h2>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ml-2 shrink-0 ${hasUnread ? "text-blue-400 font-medium" : "text-[#8696A0]"}`}>
                                                    {chat.time}
                                                </span>
                                                {/* Badge de compteur de messages non lus */}
                                                {hasUnread && (
                                                    <div className="bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold animate-pulse">
                                                        {chat.unread > 99 ? '99+' : chat.unread}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-sm truncate pr-2 transition-colors ${hasUnread ? "text-[#E9EDEF] font-medium" : "text-[#8696A0]"
                                                }`}>
                                                {chat.type === "image" ? (
                                                    <span className="flex items-center gap-1">
                                                        <span className="text-[#8696A0]">📸</span> Photo
                                                    </span>
                                                ) : (
                                                    <HighlightText text={chat.lastMessage} searchQuery={searchQuery} />
                                                )}
                                            </p>
                                            {/* Chevrons seulement si j'ai envoyé le dernier message */}
                                            {chat.isLastMessageFromMe && (
                                                <div className="flex-shrink-0 ml-1">
                                                    {chat.isLastMessageRead ? (
                                                        // L'autre a lu mon dernier message - chevrons bleus
                                                        <svg className="w-4 h-4 text-[#53BDEB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 13l4 4L23 7" />
                                                        </svg>
                                                    ) : (
                                                        // L'autre n'a pas encore lu mon dernier message - chevrons gris
                                                        <svg className="w-4 h-4 text-[#8696A0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 13l4 4L23 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Barre indicatrice subtile pour messages non lus */}
                                    {hasUnread && (
                                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full"></div>
                                    )}
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}

const HighlightText = ({ text, searchQuery }: {
    text: string,
    searchQuery: string
}) => {
    if (!searchQuery) return <>{text}</>

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'))

    return (
        <>
            {parts.map((part, i) => (
                part.toLowerCase() === searchQuery.toLowerCase() ?
                    <span key={i} className="bg-[#00A884] text-[#111B21] px-0.5 rounded">
                        {part}
                    </span>
                    :
                    <span key={i}>{part}</span>
            ))}
        </>
    )
}