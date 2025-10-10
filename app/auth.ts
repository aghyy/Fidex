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
  emailVerified: Date | null;
};

type AuthorizedUser = {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

const providers: Provider[] = [
  WebAuthn({ enableConditionalUI: true }),
  Credentials({
    name: "Credentials",
    credentials: {
      emailOrUsername: { label: "Email or Username", type: "text" },
      password: { label: "Password", type: "password" },
      passkey: { label: "Passkey", type: "text" },
    },
    async authorize(credentials): Promise<AuthorizedUser | null> {
      const rawUser = credentials?.emailOrUsername;
      const rawPass = credentials?.password;
      const input = typeof rawUser === "string" ? rawUser.trim() : "";
      const inputLower = input.toLowerCase();

      if (credentials?.passkey === "verified" && input) {
        const user = (await prisma.user.findFirst({
          where: {
            OR: [
              { email: input },
              { email: inputLower },
              { username: input },
              { username: inputLower },
            ],
          },
        })) as DbUser | null;
        if (user) {
          return { id: user.id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName };
        }
      }

      if (!input || typeof rawPass !== "string" || rawPass.length === 0) {
        return null;
      }

      const user = (await prisma.user.findFirst({
        where: {
          OR: [
            { email: input },
            { email: inputLower },
            { username: input },
            { username: inputLower },
          ],
        },
      })) as DbUser | null;
      if (!user || !user.password) return null;
      if (!user.emailVerified) {
        // Block login for unverified accounts
        return null;
      }

      const isPasswordValid = await bcrypt.compare(rawPass, user.password);
      if (!isPasswordValid) return null;

      return { id: user.id, email: user.email, username: user.username, firstName: user.firstName, lastName: user.lastName };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        const fullName = (profile.name || "").trim();
        const nameParts = fullName.split(/\s+/).filter((part: string) => part.length > 0);

        let firstName = nameParts[0] || "";
        if (!firstName) {
          const emailPrefix = profile.email.split("@")[0];
          firstName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        if (!lastName && firstName) lastName = "User";

        let baseUsername = (firstName + lastName)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "");
        if (!baseUsername || baseUsername.length < 3) {
          baseUsername = profile.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
        }
        if (!baseUsername || baseUsername.length < 3) baseUsername = `user${Math.floor(100000 + Math.random() * 900000)}`;
        if (baseUsername.length < 3) baseUsername = baseUsername + Math.floor(100 + Math.random() * 900);
        if (baseUsername.length > 15) baseUsername = baseUsername.substring(0, 15);

        let username = baseUsername;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 20;
        while (!isUnique && attempts < maxAttempts) {
          try {
            const existingUser = await prisma.user.findUnique({ where: { username } });
            if (!existingUser) {
              isUnique = true;
            } else {
              const randomNum = Math.floor(1000 + Math.random() * 9000);
              username = `${baseUsername}${randomNum}`;
              attempts++;
            }
          } catch (error) {
            console.error("Error checking username uniqueness:", error);
            username = `${baseUsername}${Date.now().toString().slice(-6)}`;
            break;
          }
        }
        if (!isUnique) {
          username = `user${Date.now().toString().slice(-8)}`;
          console.warn("Could not generate unique username, using timestamp fallback:", username);
        }
        if (username.length < 3 || username.length > 20) {
          username = `user${Date.now().toString().slice(-8)}`;
        }

        return {
          id: profile.sub,
          email: profile.email,
          firstName: firstName || "User",
          lastName: lastName || "",
          username,
          image: profile.picture || null,
        };
      },
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/signin`,
  },
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
  experimental: { enableWebAuthn: true },
  callbacks: {
    async redirect({ url, baseUrl }) {
      const frontendUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (url.startsWith("/")) return `${frontendUrl}${url}`;
      if (url.startsWith(baseUrl)) return url.replace(baseUrl, frontendUrl);
      if (url.startsWith(frontendUrl)) return url;
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
      }
      if (trigger === "update" && updatedSession) {
        token.username = updatedSession.user?.username;
        token.firstName = updatedSession.user?.firstName;
        token.lastName = updatedSession.user?.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const su = session.user as Partial<{ id: string; email: string; username: string; firstName: string; lastName: string }>;
        if (token.id) su.id = token.id as string;
        if (token.email) su.email = token.email as string;
        if (token.username) su.username = token.username as string;
        if (token.firstName) su.firstName = token.firstName as string;
        if (token.lastName) su.lastName = token.lastName as string;
      }
      return session;
    },
  },
});


