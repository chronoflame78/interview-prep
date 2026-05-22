import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = nanoid(10);

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { shareSlug: slug },
    select: { shareSlug: true },
  });

  return NextResponse.json(user);
}
