import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { shareSlug: slug },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const questions = await getQuestionsForUser(targetUser.id);
  return NextResponse.json({ user: targetUser, questions });
}
