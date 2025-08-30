"use client"
import{sidebarLinks} from '@/constants/'
import Link from 'next/link'
import { usePathname, useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function LeftSidebar(){
    const isUserLoggedIn = true;
    const router = useRouter();
    const pathname = usePathname();
    return (<section className="leftsidebar">
        <div className="flex flex-col gap-4">
            {sidebarLinks.map((link) =>{
                const isActive = (pathname.includes(link.route)&&link.route.length>1)|| pathname===link.route;
                return(
                <Tooltip key={link.label}>
                    <TooltipTrigger asChild>
                        <Link 
                            href={link.route} 
                            className={`leftsidebar_link ${isActive 
                                ? 'bg-primary-500/20 border border-primary-500/30 text-primary-500 shadow-lg shadow-primary-500/20' 
                                : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5 border border-transparent'
                            }`}
                        >
                            <link.icon
                                className={`transition-all duration-200 ${
                                    isActive
                                        ? 'text-green-500'
                                        : 'opacity-60 group-hover:opacity-100'
                                }`}
                                size={20}
                            />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{link.label}</p>
                    </TooltipContent>
                </Tooltip>
            )})}
        </div>
    </section>)
}
export default LeftSidebar