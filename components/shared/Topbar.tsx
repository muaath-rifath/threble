"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { topbarNav } from '@/constants/'
import { ModeToggle } from "../ui/mode-toggle";
import ProfileMenu from "./ProfileMenu";
function Topbar() {

    return (
        <nav className="topbar">
            <Link className="flex items-center gap-4" href="/">
                <Image src="/assets/logo.svg" alt="logo" width={28} height={28} />
                <p className="text-heading3-bold text-light-5 max-xs:hidden">Threble</p>
            </Link>

            <div className="flex flex-right gap-4 items-center">
                <ModeToggle />
                {topbarNav.map((link) => {
                    return (
                        <div className="flex w-10" key={link.label}>
                            <Link href={link.route} className="flex items-center">
                                <Image 
                                    src={link.imgURL} 
                                    className="dark:invert p-0.5" 
                                    alt={link.label} 
                                    height={24} 
                                    width={24} 
                                />
                            </Link>
                        </div>
                    )
                })}
                
                <ProfileMenu />
            </div>
        </nav>
    )
}

export default Topbar
