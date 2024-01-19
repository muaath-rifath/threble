"use client"
import Link from "next/link"
import Image from "next/image"
import ThemeToggle from "@components/ThemeToggle";
import { useState, useEffect } from 'react';
import { signIn, signOut, useSession, getProviders } from 'next-auth/react';
import{userProfile} from '@/constants/'
function Topbar() {
    const isUserLoggedIn = true;
    return (<nav className="topbar">
        <Link className="flex items-center gap-4" href="/">
            <Image src="/assets/logo.svg" alt="logo" width={28} height={28} />
            <p className="text-heading3-bold text-light-5 max-xs:hidden">Threble</p>
        </Link>
        <div className="flex flex-column items-center gap-4 max-lg:hidden">
            <Link href="/explore">
                Explore
            </Link>
            <Link href="/notifications">
                Notifications
            </Link>
            <Link href="/messages">
                Messages
            </Link>
            <Link href="/bookmarks">
                Bookmarks
            </Link>
        </div>
        <div className="flex flex-right gap-4 items-center"><ThemeToggle />
        <Link href="/profile">
        <Image src={userProfile.imgURL} className="dark:invert" alt={userProfile.label} width={24} height={24} />
        </Link>
        </div>
    </nav>)
}
export default Topbar