import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { v4 as uuid } from 'uuid';
const prisma = new PrismaClient()

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, username } = body

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 })
    }

    const exist = await prisma.user.findUnique({
      where: {
        email
      }
    })

    if (exist) {
      return new NextResponse("Email already exists", { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        userId: uuid(),
        role: 0,
        avatar: "https://picsum.photos/300",
        email,
        username,
        password: hashedPassword,
        platform: "credentials"
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.log("[REGISTRATION_ERROR]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
