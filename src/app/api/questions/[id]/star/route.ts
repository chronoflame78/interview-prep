import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Marks a question important for the current user only — defaults stay shared,
// so one user's star never shows up in another user's list.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: questionId } = await params;
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { id: true, isDefault: true, createdBy: true },
  });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Same visibility rule as the question list: defaults, or your own questions.
  if (!question.isDefault && question.createdBy !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.userQuestionStar.upsert({
    where: { userId_questionId: { userId: session.user.id, questionId } },
    create: { userId: session.user.id, questionId },
    update: {},
  });

  return NextResponse.json({ isImportant: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: questionId } = await params;

  await prisma.userQuestionStar.deleteMany({
    where: { userId: session.user.id, questionId },
  });

  return NextResponse.json({ isImportant: false });
}
