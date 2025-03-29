"use client"

import { Icons } from "@/components/Icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { UserInfo } from "@/types/user"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useState } from "react"
import { toast } from "react-hot-toast"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  user?: UserInfo
}

export function UserAuthForm({ className, user, ...props }: UserAuthFormProps) {
  const [loading, setLoading] = useState(false)
  const [isEmailLogin, setIsEmailLogin] = useState(false)
  const router = useRouter()

  const login = async (platform: string) => {
    if (user && user.userId) {
      router.push("/")
      return
    }
    setLoading(true)
    signIn(platform, {
      callbackUrl: `${window.location.origin}`,
    })
  }

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (user && user.userId) {
      router.push("/")
      return
    }
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error("Invalid credentials")
        return
      }

      router.push("/")
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("grid gap-4", className)} {...props}>
      {!isEmailLogin ? (
        <>
          <Button
            variant="outline"
            className="border-gray-400"
            onClick={() => login("google")}
            disabled={loading}
          >
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.google className="mr-2 h-4 w-4" />
            )}
            Google
          </Button>
          <Button
            variant="outline"
            className="border-gray-400"
            onClick={() => login("github")}
            disabled={loading}
          >
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.gitHub className="mr-2 h-4 w-4" />
            )}
            Github
          </Button>
          <Button
            variant="outline"
            className="border-gray-400"
            onClick={() => setIsEmailLogin(true)}
          >
            Email / Password
          </Button>
        </>
      ) : (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Sign in"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setIsEmailLogin(false)}
          >
            Back to social login
          </Button>
        </form>
      )}
    </div>
  )
}
