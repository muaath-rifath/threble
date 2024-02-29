"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import ThemeToggle from "@components/ThemeToggle";
import { useState, useEffect } from 'react';
import { signIn, signOut, useSession, getProviders } from 'next-auth/react';
import { userProfile, topbarLinks, topbarNav } from '@/constants/'
function Topbar() {
    const isUserLoggedIn = true;
    const router = useRouter();
    const pathname = usePathname();
    return (<nav className="topbar">
        <Link className="flex items-center gap-4" href="/">
            <Image src="/assets/logo.svg" alt="logo" width={28} height={28} />
            <p className="text-heading3-bold text-light-5 max-xs:hidden">Threble</p>
        </Link>

        <div className="flex flex-right gap-4 items-center">
        {topbarNav.map((link) => {
            return (
                <div className="flex w-10">
                    <Link href={link.route} key={link.label} className="flex items-center">
                        <Image src={link.imgURL} className="dark:invert p-0.5" alt={link.label} height={24} width={24} />
                    </Link>
                </div>
            )
        })} 
        <ThemeToggle/>
            <Link href="/profile">
                <Image src={userProfile.imgURL}
                    className="dark:invert"
                    alt={userProfile.label}
                    width={20}
                    height={20} />
            </Link>
        </div>
    </nav>)
}
export default Topbar
/* <Link href={topbarLinks.route} key={topbarLinks.label} className="topbar_link">
                    <Image src={topbarLinks.imgURL} className="dark:invert" alt={topbarLinks.label} width={24} height={24} />
                    <p className="text-dark-2 dark:text-light-1 max-lg:hidden">{topbarLinks.label}</p>
        </Link> */