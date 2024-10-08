import "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      hasProfile?: boolean
      needsOnboarding?: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
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
