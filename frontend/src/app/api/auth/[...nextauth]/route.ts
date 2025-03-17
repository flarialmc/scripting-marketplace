// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// Define the shape of the user object that will be added to the session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// NextAuth configuration options
export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // Optional: Specify the scope if you need additional permissions
      authorization: { params: { scope: "identify" } }, // 'identify' is enough for username and ID
    }),
  ],
  callbacks: {
    // Add Discord ID to the session
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Discord ID
      }
      return session;
    },
    // Optional: Customize the JWT token if needed
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  // Optional: Customize the pages if you want custom sign-in/sign-out pages
  pages: {
    signIn: undefined, // Use default NextAuth sign-in page
    signOut: undefined, // Use default NextAuth sign-out page
  },
  secret: process.env.NEXTAUTH_SECRET, // Required for security
};

// Create the NextAuth handler
const handler = NextAuth(authOptions);

// Export the handler for both GET and POST requests
export { handler as GET, handler as POST };