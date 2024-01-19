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
                <Link href={link.route} key={link.label} className={`bottombar_link ${isActive&&'bg-primary-500'}`}>
                    <div className="flex flex-col items items-center">
                    <Image src={link.imgURL} className='dark:invert' alt={link.label} width={24} height={24} />
                    <p className="text-subtle-medium text-light-1 max-sm:hidden">{link.label.split(/\s+/)[0]}</p>
                    </div>
                </Link>
            )})}
        </div>
    </section>)
}
export default Bottombar