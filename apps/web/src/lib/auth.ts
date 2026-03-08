import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      image?: string;
      name?: string;
    };
    accessToken: string;
    refreshToken: string;
  }

  interface User {
    id: string;
    email: string;
    username: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    image?: string;
    name?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    username: string;
    role: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
  }
}

async function refreshAccessToken(token: any) {
  try {
    // If username is missing from token, force re-login
    if (!token.username) {
      console.error('Username missing from token, forcing re-login');
      return {
        ...token,
        error: 'RefreshAccessTokenError',
      };
    }

    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken: token.refreshToken,
    });

    const { accessToken, refreshToken, expiresIn, user } = response.data.data;

    return {
      ...token,
      accessToken,
      refreshToken: refreshToken ?? token.refreshToken,
      accessTokenExpires: Date.now() + expiresIn * 1000,
      // Update user data if returned from API
      ...(user && {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      }),
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: credentials.email,
            password: credentials.password,
          });

          const { user, accessToken, refreshToken, expiresIn } = response.data.data;

          return {
            id: user.id,
            email: user.email,
            username: user.username,
            name: user.profile?.displayName || user.username,
            image: user.profile?.avatarUrl,
            role: user.role,
            accessToken,
            refreshToken,
          };
        } catch (error: any) {
          const message = error.response?.data?.error?.message || 'Invalid credentials';
          throw new Error(message);
        }
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign in
      if (account?.provider === 'github' || account?.provider === 'google') {
        try {
          const response = await axios.post(`${API_URL}/auth/oauth/${account.provider}`, {
            accessToken: account.access_token,
            profile: {
              id: profile?.sub || (profile as any)?.id,
              email: user.email,
              name: user.name,
              image: user.image,
              username: (profile as any)?.login || user.email?.split('@')[0],
            },
          });

          const { user: dbUser, accessToken, refreshToken } = response.data.data;

          // Attach tokens to user object
          (user as any).id = dbUser.id;
          (user as any).username = dbUser.username;
          (user as any).role = dbUser.role;
          (user as any).accessToken = accessToken;
          (user as any).refreshToken = refreshToken;

          return true;
        } catch (error) {
          console.error('OAuth sign in error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.username = user.username;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
      }

      // Return previous token if not expired
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token expired, try to refresh
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      if (token.error === 'RefreshAccessTokenError') {
        // Force sign out if refresh fails
        return {
          ...session,
          error: 'RefreshAccessTokenError',
        } as any;
      }

      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        role: token.role,
        name: session.user?.name,
        image: session.user?.image,
      };
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;

      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    newUser: '/onboarding',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
