import { Inter } from "next/font/google"
import '../globals.css';
export const metadata = {
    title: 'Threble',
    description: 'A social network for tech community'
}
const inter = Inter({ subsets: ["latin"] })
export default function RootLayout({
    children
}: {
    children: React.ReactNode

}) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>)
}
