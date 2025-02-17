"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { topbarNav } from '@/constants/'
import ProfileMenu from "./ProfileMenu";
function Topbar() {
    const pathname = usePathname();

    return (
        <nav className="topbar">
            <Link className="flex items-center gap-4" href="/">
                <Image src="/assets/logo.svg" alt="logo" width={28} height={28} />
                <p className="text-heading3-bold dark:text-light-5 max-xs:hidden">Threble</p>
            </Link>

            <div className="flex flex-right gap-4 items-center">
                {topbarNav.map((link) => {
                    const isActive = pathname === link.route;
                    return (
                        <div className="flex w-10" key={link.label}>
                            <Link href={link.route} className="flex items-center">
                                <Image 
                                    src={link.imgURL} 
                                    className={`dark:invert p-0.5 ${isActive ? 'invert' : ''}`}
                                    alt={link.label} 
                                    height={24} 
                                    width={24} 
                                />
                                {link.label && <span className="sr-only">{link.label}</span>}
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
