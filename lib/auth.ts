 
import { ONE_DAY } from "@/lib/constants";
import { getUserSubscriptionStatus } from "@/lib/lemonsqueezy/subscriptionFromStorage";
import prisma from "@/lib/prisma";
import { UserInfo } from "@/types/user";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { Account, NextAuthOptions, TokenSet } from "next-auth";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import redis from "./redis";
// Here you define the type for the token object that includes accessToken.
interface ExtendedToken extends TokenSet {
  accessToken?: string;
  userId?: string;
}
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
    signOut: '/auth/logout',
  },
  providers: [
    GithubProvider({
      clientId: `${process.env.GITHUB_ID}`,
      clientSecret: `${process.env.GITHUB_SECRET}`,
      httpOptions: {
        timeout: 50000,
      },
    }),
    GoogleProvider({
      clientId: `${process.env.GOOGLE_ID}`,
      clientSecret: `${process.env.GOOGLE_SECRET}`
    }),
        EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        console.log('prisma.user: ', prisma.user);
        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.userId,
          email: user.email,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 登录(account仅登录那一次有值)
      // Only on sign in (account only has a value at that time)
      if (account) {
        token.accessToken = account.access_token

        // 存储访问令牌
        // Store the access token
        await storeAccessToken(account.access_token || '', token.sub);

        // 用户信息存入数据库
        // Save user information in the database
        const userInfo = await upsertUserAndGetInfo(token, account);
        if (!userInfo || !userInfo.userId) {
          throw new Error('User information could not be saved or retrieved.');
        }

        const planRes = await getUserSubscriptionStatus({ userId: userInfo.userId, defaultUser: userInfo })
        const fullUserInfo = {
          userId: userInfo.userId,
          username: userInfo.username,
          avatar: userInfo.avatar,
          email: userInfo.email,
          platform: userInfo.platform,
          role: planRes.role,
          membershipExpire: planRes.membershipExpire,
          accessToken: account.access_token
        }
        return fullUserInfo
      }
      return token as any
    },
    async session({ session, token }) {
      // Append user information to the session
      if (token && token.userId) {
        session.user = await getSessionUser(token);
      }
      return session;
    }
  },
}
async function storeAccessToken(accessToken: string, sub?: string) {
  if (!accessToken || !sub) return;
  const expire = ONE_DAY * 30; // The number of seconds in 30 days
  await redis.set(accessToken, sub, { ex: expire });
}
async function upsertUserAndGetInfo(token: JWT, account: Account) {
  const user = await upsertUser(token, account.provider);
  if (!user || !user.userId) return null;

  const subscriptionStatus = await getUserSubscriptionStatus({ userId: user.userId, defaultUser: user });

  return {
    ...user,
    role: subscriptionStatus.role,
    membershipExpire: subscriptionStatus.membershipExpire,
  };
}
async function upsertUser(token: JWT, provider: string) {
  const userData = {
    userId: token.sub,
    username: token.name,
    avatar: token.picture,
    email: token.email,
    platform: provider,
  };

  const user = await prisma.user.upsert({
    where: { userId: token.sub },
    update: userData,
    create: { ...userData, role: 0 },
  });

  return user || null;
}
async function getSessionUser(token: ExtendedToken): Promise<UserInfo> {
  const planRes = await getUserSubscriptionStatus({ userId: token.userId as string });
  return {
    userId: token.userId,
    username: token.username,
    avatar: token.avatar,
    email: token.email,
    platform: token.platform,
    role: planRes.role,
    membershipExpire: planRes.membershipExpire,
    accessToken: token.accessToken
  } as UserInfo;
}
