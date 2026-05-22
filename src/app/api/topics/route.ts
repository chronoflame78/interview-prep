import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validations/topic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    where: {
      OR: [{ isDefault: true }, { createdBy: session.user.id }],
    },
    include: {
      subTopics: {
        where: {
          OR: [{ isDefault: true }, { createdBy: session.user.id }],
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = topicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  const topic = await prisma.topic.create({
    data: {
      name: parsed.data.name,
      isDefault: isAdmin && body.isDefault === true,
      createdBy: isAdmin && body.isDefault === true ? null : session.user.id,
    },
    include: { subTopics: true },
  });

  return NextResponse.json(topic, { status: 201 });
}
