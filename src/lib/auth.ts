
import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";


declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      login?: string;
    };
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email public_repo"
        }
      }
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.login = token.login as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === "github") {
        token.login = account.login;
        token.accessToken = account.access_token;
      }
      return token;
    },
  },
  pages: {
    signIn: undefined,
    signOut: undefined,
  },
  secret: process.env.NEXTAUTH_SECRET,
};