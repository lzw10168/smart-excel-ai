import { Metadata } from "next";
import Link from "next/link";

import { UserAuthForm } from "@/components/UserAuthForm";
import { getCurrentUser } from "@/lib/session";
import { UserInfo } from "@/types/user";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};


export default async function LoginPage() {
  const user = (await getCurrentUser()) as UserInfo

  return (
    <div className="container flex w-screen flex-col items-center justify-center">
      <div className="mx-auto flex flex-1 w-full flex-col justify-center space-y-6 sm:w-[350px] px-4">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
  
        </div>
        <UserAuthForm user={user} />
        <p className="px-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
        <p className="px-8 text-center text-sm text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <Link
            href="/privacy"
            className="hover:text-brand underline underline-offset-4"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
