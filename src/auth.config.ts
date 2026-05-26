import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize() {
        // Actual authorization happens in auth.ts — this stub keeps the
        // Edge-compatible config aware that Credentials exists.
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user.role ?? "USER") as "USER" | "ADMIN";
        token.activeDomainId = (user.activeDomainId as string) ?? null;
      }
      if (trigger === "update" && session?.activeDomainId !== undefined) {
        token.activeDomainId = session.activeDomainId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "ADMIN";
        session.user.activeDomainId = (token.activeDomainId as string) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
