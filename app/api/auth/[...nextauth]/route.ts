import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/app/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        if (user && user.password && await compare(credentials.password, user.password)) {
          return user;
        }
        return null;
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    signUp: "/signup"
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || "Google User",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Include isAdmin in the JWT token when user signs in
      if (user) {
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      // Add isAdmin from token to the session
      if (token && session.user) {
        session.user.isAdmin = token.isAdmin;
      }
      return session;
    },
  }
};

// Add default URL here
export const dynamic = "force-dynamic";

const handler = NextAuth({
  ...authOptions,
  callbacks: {
    ...authOptions.callbacks,
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  }
});
export { handler as GET, handler as POST };
