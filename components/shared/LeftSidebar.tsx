"use client"
import{sidebarLinks} from '@/constants/'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from "next/navigation"
function LeftSidebar(){
    const isUserLoggedIn = true;
    const router = useRouter();
    const pathname = usePathname();
    return (<section className="custom-scrollbar leftsidebar">
        <div className="flex w-full flex-1 flex-col gap-6 px-6">
            {sidebarLinks.map((link) =>{
                const isActive = (pathname.includes(link.route)&&link.route.length>1)|| pathname===link.route;
                return(
                <Link href={link.route} key={link.label} className={`leftsidebar_link transition-all duration-200 ${isActive ? 'bg-primary-500/20 border border-primary-500/30 text-primary-500' : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'}`}>
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
                    <p className={`max-lg:hidden font-medium`}>{link.label}</p>
                </Link>
            )})}
        </div>
        <div className="mt-10 px-6">
  
</div>
    </section>)
}
export default LeftSidebar