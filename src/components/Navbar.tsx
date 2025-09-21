import React from 'react'
import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from '@clerk/clerk-react'
import { ModeToggle } from './ToggleTheme'
import Link from 'next/link'

const Navbar = () => {
    return (
        <>
            <div className="w-full h-16 bg-[#00A884] dark:bg-[#111B21] flex items-center justify-end px-4 border-b border-black/20 dark:border-white/20">
                <div className="flex items-center space-x-4 pr-4 ">
                    <ModeToggle />
                    <SignedOut>
                        <SignInButton />
                    </SignedOut>
                    <SignedIn>
                        <UserButton />
                        <SignOutButton />
                    </SignedIn>

                </div>
            </div>
        </>
    )
}

export default Navbar