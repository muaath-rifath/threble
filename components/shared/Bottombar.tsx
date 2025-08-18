"use client"
import { leftSidebarLinks } from '@/constants'
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from "next/navigation";
function Bottombar(){
    const pathname=usePathname();
    return(<section className="bottombar">
        <div className="bottombar_container">
        {leftSidebarLinks.map((link) =>{
                const isActive = (pathname.includes(link.route)&&link.route.length>1)|| pathname===link.route;
                return(
                <Link href={link.route} key={link.label} className={`bottombar_link ${isActive ? 'bg-primary-500/20 border border-primary-500/30' : ''}`}>
                    <div className="flex flex-col items items-center">
                    <Image 
                        src={link.imgURL} 
                        className={`transition-all duration-200 ${
                            isActive 
                                ? 'brightness-0 saturate-100' 
                                : 'opacity-60 dark:invert hover:opacity-100'
                        }`}
                        alt={link.label} 
                        width={24} 
                        height={24}
                        style={{
                            filter: isActive ? 'brightness(0) saturate(100%) invert(39%) sepia(96%) saturate(318%) hue-rotate(130deg) brightness(96%) contrast(96%)' : ''
                        }}
                    />
                    <p className={`text-subtle-medium max-sm:hidden transition-colors duration-200 ${
                        isActive ? 'text-primary-500' : 'text-black/60 dark:text-white/60'
                    }`}>{link.label.split(/\s+/)[0]}</p>
                    </div>
                </Link>
            )})}
        </div>
    </section>)
}
export default Bottombar