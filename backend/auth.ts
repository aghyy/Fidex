import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

const providers: any[] = [
  Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

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
          name: user.name,
          image: user.image,
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
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/signin`,
  },
  providers,
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

