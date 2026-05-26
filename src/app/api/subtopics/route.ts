import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subTopicSchema } from "@/lib/validations/topic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { activeDomainId: true },
  });

  const subTopics = await prisma.subTopic.findMany({
    where: {
      ...(topicId
        ? { topicId }
        : { topic: { domainId: user?.activeDomainId } }),
      OR: [{ isDefault: true }, { createdBy: session.user.id }],
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(subTopics);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = subTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  const subTopic = await prisma.subTopic.create({
    data: {
      name: parsed.data.name,
      topicId: parsed.data.topicId,
      isDefault: isAdmin && body.isDefault === true,
      createdBy: isAdmin && body.isDefault === true ? null : session.user.id,
    },
  });

  return NextResponse.json(subTopic, { status: 201 });
}
