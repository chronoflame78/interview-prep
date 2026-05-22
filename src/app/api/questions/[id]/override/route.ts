import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { overrideSchema } from "@/lib/validations/question";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: questionId } = await params;
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question || !question.isDefault) {
    return NextResponse.json(
      { error: "Can only override default questions" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = overrideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const override = await prisma.userQuestionOverride.upsert({
    where: {
      userId_questionId: { userId: session.user.id, questionId },
    },
    create: {
      userId: session.user.id,
      questionId,
      ...parsed.data,
    },
    update: parsed.data,
  });

  return NextResponse.json(override);
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

  await prisma.userQuestionOverride.deleteMany({
    where: { userId: session.user.id, questionId },
  });

  return NextResponse.json({ success: true });
}
