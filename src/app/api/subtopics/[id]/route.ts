import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subTopicSchema } from "@/lib/validations/topic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const subTopic = await prisma.subTopic.findUnique({ where: { id } });
  if (!subTopic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canEdit =
    subTopic.createdBy === session.user.id ||
    (subTopic.isDefault && session.user.role === "ADMIN");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = subTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.subTopic.update({
    where: { id },
    data: { name: parsed.data.name, topicId: parsed.data.topicId },
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
  const subTopic = await prisma.subTopic.findUnique({ where: { id } });
  if (!subTopic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canDelete =
    subTopic.createdBy === session.user.id ||
    (subTopic.isDefault && session.user.role === "ADMIN");
  if (!canDelete) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.subTopic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
