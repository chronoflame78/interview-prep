import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getQuestionForUser } from "@/lib/questions";
import { questionSchema } from "@/lib/validations/question";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const question = await getQuestionForUser(session.user.id, id);
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(question);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canEdit =
    question.createdBy === session.user.id ||
    (question.isDefault && session.user.role === "ADMIN");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const relatedIds = parsed.data.relatedQuestionIds.filter(
    (rid: string) => !!rid && rid !== id
  );

  const updated = await prisma.question.update({
    where: { id },
    data: {
      question: parsed.data.question,
      questionVn: parsed.data.questionVn,
      questionCus: parsed.data.questionCus,
      answer: parsed.data.answer,
      answerVn: parsed.data.answerVn,
      answerCus: parsed.data.answerCus,
      difficulty: parsed.data.difficulty,
      topics: {
        deleteMany: {},
        create: parsed.data.topicIds.map((topicId: string) => ({ topicId })),
      },
      subTopics: {
        deleteMany: {},
        create: parsed.data.subTopicIds.map((subTopicId: string) => ({
          subTopicId,
        })),
      },
      relatedTo: {
        deleteMany: {},
        create: relatedIds.map((toQuestionId: string) => ({ toQuestionId })),
      },
    },
    include: {
      topics: { include: { topic: true } },
      subTopics: { include: { subTopic: true } },
      relatedTo: {
        include: {
          toQuestion: {
            select: { id: true, question: true, difficulty: true },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    question.createdBy === session.user.id ||
    (question.isDefault && session.user.role === "ADMIN");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
