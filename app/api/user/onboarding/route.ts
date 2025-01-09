import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { uploadFileToBlobStorage } from "@/lib/azure-storage";

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const { userId, username, bio, location, website, birthDate, name } = Object.fromEntries(formData);

        let imageUrl = null;
       const imageFile = formData.get('image') as File | null;

        if (imageFile) {
             imageUrl = await uploadFileToBlobStorage(imageFile);
        }

        if (!userId) {
            return NextResponse.json({ error: "User ID is required." }, { status: 400 });
        }


        const updatedUser = await prisma.user.update({
            where: { id: userId as string },
             data: {
                username: username as string,
                name: name as string,
                 image: imageUrl || undefined,
                profile: {
                    upsert: {
                        create: {
                            bio: bio as string | undefined,
                            location: location as string | undefined,
                            website: website as string | undefined,
                            birthDate: birthDate ? new Date(birthDate as string) : undefined,
                        },
                        update: {
                            bio: bio as string | undefined,
                            location: location as string | undefined,
                            website: website as string | undefined,
                            birthDate: birthDate ? new Date(birthDate as string) : undefined,
                        },
                    },
                },
            },
            include: {
                profile: true,
            },
        })


        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
    }
}