"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { topbarNav } from '@/constants/'
import ProfileMenu from "./ProfileMenu"
import { NotificationDropdown } from "./NotificationDropdown"
import { useIsMobile } from "@/hooks/use-mobile"
import { DropdownProvider } from "./DropdownContext"

function Topbar() {
    const pathname = usePathname()
    const isMobile = useIsMobile()

    return (
        <DropdownProvider>
            <nav className="topbar">
            <Link className="flex items-center gap-4" href="/">
                <Image src="/assets/logo.svg" alt="logo" width={28} height={28} />
                <p className="text-heading3-bold text-black dark:text-white max-xs:hidden">Threble</p>
            </Link>

            <div className="flex flex-right gap-4 items-center">
                {topbarNav.map((link) => {
                    const isActive = pathname === `/${link.route}`
                    
                    // Special handling for notifications
                    if (link.label === "Notification") {
                        return (
                            <div className="flex w-10" key={link.label}>
                                <NotificationDropdown isMobile={isMobile} />
                            </div>
                        )
                    }
                    
                    return (
                        <div className="flex w-10" key={link.label}>
                            <Link href={`/${link.route}`} className="flex items-center glass-button rounded-xl p-2">
                                <link.icon
                                    className={`transition-all duration-200 ${isActive ? 'text-green-500' : 'opacity-60 hover:opacity-100'}`}
                                    size={24}
                                />
                                {link.label && <span className="sr-only">{link.label}</span>}
                            </Link>
                        </div>
                    )
                })}
                
                <ProfileMenu />
            </div>
        </nav>
        </DropdownProvider>
    )
}

export default Topbar
