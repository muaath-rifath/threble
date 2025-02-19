import "next-auth"
import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      hasProfile: boolean
      username?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    username?: string | null
    hasProfile?: boolean
  }
}
interface ProfileData {
  // ... existing fields
  coverImage?: string;
  profile?: {
    // ... existing fields
    coverImage?: string;
  };
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    hasProfile?: boolean
  }
}
