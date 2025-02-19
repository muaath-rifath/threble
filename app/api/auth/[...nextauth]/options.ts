import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  // Ensure the NEXTAUTH_SECRET is set
  secret: process.env.NEXTAUTH_SECRET,

  // Use the PrismaAdapter to connect NextAuth.js with your Prisma ORM setup
  adapter: PrismaAdapter(prisma),

  // Define OAuth providers (Google and GitHub)
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  // Configure session strategy to use JWT
  session: {
    strategy: "jwt",
  },

  // Define callbacks to manage sign-in, JWT, and session
  callbacks: {
    /**
     * The `signIn` callback is called whenever a user attempts to sign in.
     * It handles linking OAuth accounts to existing users or creating new users if they don't exist.
     */
    async signIn({ user, account, profile }) {
      console.log("SignIn Callback:", { user, account, profile })
      
      if (!account) {
        console.error("Account is null or undefined.")
        return false
      }
    
      if (["google", "github"].includes(account.provider)) {
        try {
          // Check if the user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: { accounts: true },
          });
    
          if (existingUser) {
            // If the user exists, check if this OAuth account is already linked
            const linkedAccount = existingUser.accounts.find(
              (acc) => acc.provider === account.provider && acc.providerAccountId === account.providerAccountId
            );
    
            if (!linkedAccount) {
              // If the account is not linked, create a new account for the user
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
            }
          } else {
            // If the user doesn't exist, create a new user
            await prisma.user.create({
              data: {
                name: user.name,
                email: user.email!,
                image: user.image,
                accounts: {
                  create: {
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                    session_state: account.session_state,
                  },
                },
              },
            });
          }
    
          console.log("Account is valid for provider:", account.provider);
          return true;
        } catch (error) {
          console.error("Error during signIn callback:", error);
          return false;
        }
      }
    
      return true
    },

    /**
     * The `jwt` callback is called whenever a JSON Web Token is created or updated.
     * It adds custom fields to the token, such as `id` and `hasProfile`.
     */
    async jwt({ token, user, account, profile, isNewUser }) {
      console.log("JWT Callback:", { token, user, account, profile, isNewUser });
    
      if (user) {
        token.id = user.id;
      }
    
      try {
        // Always fetch fresh user data for the JWT
        const userData = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { 
            profile: true,
            accounts: true
          }
        });

        if (userData) {
          token.hasProfile = !!userData.profile;
          token.username = userData.username;
          token.image = userData.image;
        }

        return token;
      } catch (error) {
        console.error('Error in JWT callback:', error);
        return token;
      }
    },
    

    /**
     * The `session` callback is called whenever a session is checked.
     * It adds custom fields to the session object, such as `id`, `hasProfile`, and `needsOnboarding`.
     */
    async session({ session, token }) {
      console.log("Session Callback:", { session, token })

      if (session.user && token) {
        try {
          // Get fresh user data for the session
          const userData = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { profile: true }
          });

          session.user.id = token.id as string;
          session.user.hasProfile = !!userData?.profile;
          session.user.username = userData?.username;
          session.user.image = userData?.image;

          console.log('Session updated with fresh data:', {
            userId: session.user.id,
            hasProfile: session.user.hasProfile,
            username: session.user.username
          });
        } catch (error) {
          console.error('Error in session callback:', error);
        }
      }
      return session;
    },
  },

  // Define custom pages
  pages: {
    signIn: "/signin",
    error: "/auth/error",
  },

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
}
