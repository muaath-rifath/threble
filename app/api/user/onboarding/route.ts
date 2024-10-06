import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, username, bio, avatar, location, website, birthDate, name } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        name,
        profile: {
          upsert: {
            create: {
              bio,
              avatar,
              location,
              website,
              birthDate: birthDate ? new Date(birthDate) : undefined,
            },
            update: {
              bio,
              avatar,
              location,
              website,
              birthDate: birthDate ? new Date(birthDate) : undefined,
            },
          },
        },
      },
      include: {
        profile: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
