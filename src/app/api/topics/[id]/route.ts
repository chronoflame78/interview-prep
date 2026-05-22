import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validations/topic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canEdit =
    topic.createdBy === session.user.id ||
    (topic.isDefault && session.user.role === "ADMIN");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = topicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.topic.update({
    where: { id },
    data: { name: parsed.data.name },
    include: { subTopics: true },
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
  const topic = await prisma.topic.findUnique({ where: { id } });
  if (!topic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    topic.createdBy === session.user.id ||
    (topic.isDefault && session.user.role === "ADMIN");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.topic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
