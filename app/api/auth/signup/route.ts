import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 400 });
  }

  // Hash the password
  const hashedPassword = await hash(password, 10);

  // Create the user
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword }
  });

  return NextResponse.json({ user });
}
