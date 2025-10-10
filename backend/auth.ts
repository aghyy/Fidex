import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import WebAuthn from "next-auth/providers/webauthn";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

type DbUser = {
  id: string;
  email: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  password: string | null;
};

type AuthorizedUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

const providers: Provider[] = [
  WebAuthn({
    // Enable passkey authentication
    enableConditionalUI: true,
  }),
  Credentials({
      name: "Credentials",
      credentials: {
        emailOrUsername: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
        passkey: { label: "Passkey", type: "text" },
      },
      async authorize(credentials): Promise<AuthorizedUser | null> {
        // Special case: passkey authentication (already verified)
        if (credentials?.passkey === "verified" && credentials?.emailOrUsername) {
          // Try to find user by email or username
          const emailOrUsername = credentials.emailOrUsername as string;
          const user = (await prisma.user.findFirst({
            where: {
              OR: [
                { email: emailOrUsername },
                { username: emailOrUsername },
              ],
            },
          })) as DbUser | null;

          if (user) {
            return {
              id: user.id,
              email: user.email,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
            };
          }
        }

        // Regular password authentication
        if (!credentials?.emailOrUsername || !credentials?.password) {
          return null;
        }

        // Try to find user by email or username
        const emailOrUsername = credentials.emailOrUsername as string;
        const user = (await prisma.user.findFirst({
          where: {
            OR: [
              { email: emailOrUsername },
              { username: emailOrUsername },
            ],
          },
        })) as DbUser | null;

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          // DO NOT return image - it causes headers overflow
          // image: user.image,
        };
      },
    }),
];

// Add Google provider only if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        // Extract and sanitize name parts
        const fullName = (profile.name || "").trim();
        const nameParts = fullName.split(/\s+/).filter((part: string) => part.length > 0);
        
        // Handle firstName with fallbacks
        let firstName = nameParts[0] || "";
        if (!firstName) {
          // If no name at all, use part of email before @
          const emailPrefix = profile.email.split("@")[0];
          firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
        
        // Handle lastName with fallbacks
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        if (!lastName && firstName) {
          // If only one name part, use "User" as last name to avoid confusion
          lastName = "User";
        }
        
        // Generate username: firstname + lastname, lowercase, alphanumeric only
        let baseUsername = (firstName + lastName)
          .toLowerCase()
          .normalize("NFD") // Normalize Unicode to decompose accents
          .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
          .replace(/[^a-z0-9]/g, ""); // Keep only letters and numbers
        
        // Fallback 1: If username is empty or too short, use email prefix
        if (!baseUsername || baseUsername.length < 3) {
          baseUsername = profile.email.split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        }
        
        // Fallback 2: If still too short or empty, use "user" + random numbers
        if (!baseUsername || baseUsername.length < 3) {
          baseUsername = `user${Math.floor(100000 + Math.random() * 900000)}`;
        }
        
        // Ensure minimum length (3 chars) - pad with random numbers if needed
        if (baseUsername.length < 3) {
          baseUsername = baseUsername + Math.floor(100 + Math.random() * 900);
        }
        
        // Truncate if too long (max 20 chars to leave room for random numbers)
        if (baseUsername.length > 15) {
          baseUsername = baseUsername.substring(0, 15);
        }
        
        // Check uniqueness and add random numbers if needed
        let username = baseUsername;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 20;
        
        while (!isUnique && attempts < maxAttempts) {
          try {
            const existingUser = await prisma.user.findUnique({
              where: { username },
            });
            
            if (!existingUser) {
              isUnique = true;
            } else {
              // Add random 4-digit number to base username
              const randomNum = Math.floor(1000 + Math.random() * 9000);
              username = `${baseUsername}${randomNum}`;
              attempts++;
            }
          } catch (error) {
            console.error("Error checking username uniqueness:", error);
            // If DB error, use fallback with timestamp to ensure uniqueness
            username = `${baseUsername}${Date.now().toString().slice(-6)}`;
            break;
          }
        }
        
        // Final safety check: if we couldn't find unique username after max attempts
        if (!isUnique) {
          username = `user${Date.now().toString().slice(-8)}`;
          console.warn("Could not generate unique username, using timestamp fallback:", username);
        }
        
        // Validate final username meets requirements
        if (username.length < 3 || username.length > 20) {
          // Emergency fallback
          username = `user${Date.now().toString().slice(-8)}`;
        }
        
        return {
          id: profile.sub,
          email: profile.email,
          firstName: firstName || "User",
          lastName: lastName || "",
          username,
          image: profile.picture || null, // Include Google profile picture if available
        };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  pages: {
    signIn: `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/signin`,
  },
  // In production, set cookie domain to share session across fidexapp.de and api.fidexapp.de
  ...(process.env.COOKIE_DOMAIN && {
    cookies: {
      sessionToken: {
        name: `authjs.session-token`,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          domain: process.env.COOKIE_DOMAIN,
        },
      },
    },
  }),
  providers,
  experimental: {
    enableWebAuthn: true,
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      
      // If url is relative, prepend frontend URL
      if (url.startsWith("/")) {
        return `${frontendUrl}${url}`;
      }
      
      // If url is absolute and points to backend, redirect to frontend
      if (url.startsWith(baseUrl)) {
        return url.replace(baseUrl, frontendUrl);
      }
      
      // If url already points to frontend, use it
      if (url.startsWith(frontendUrl)) {
        return url;
      }
      
      // Default to frontend root
      return frontendUrl;
    },
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.email = (user as { email: string }).email;
        const u = user as Partial<{ username: string; firstName: string; lastName: string }>;
        if (u.username) token.username = u.username;
        if (u.firstName) token.firstName = u.firstName;
        if (u.lastName) token.lastName = u.lastName;
        // DO NOT include image in JWT - it's too large and causes header overflow
        // token.image = user.image; // REMOVED
      }
      
      // Handle session updates (when user updates their profile)
      if (trigger === "update" && updatedSession) {
        token.username = updatedSession.user?.username;
        token.firstName = updatedSession.user?.firstName;
        token.lastName = updatedSession.user?.lastName;
        // Still don't include image in token
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as Partial<{
          id: string;
          email: string;
          username: string;
          firstName: string;
          lastName: string;
        }>;
        if (token.id) su.id = token.id as string;
        if (token.email) su.email = token.email as string;
        if (token.username) su.username = token.username as string;
        if (token.firstName) su.firstName = token.firstName as string;
        if (token.lastName) su.lastName = token.lastName as string;
        // DO NOT include image from token
        // Fetch image from database when needed instead
      }
      return session;
    },
  },
});

