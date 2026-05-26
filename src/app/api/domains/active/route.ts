import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { domainId } = await req.json();
  if (!domainId || typeof domainId !== "string") {
    return NextResponse.json({ error: "domainId is required" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeDomainId: domainId },
  });

  return NextResponse.json({ domainId, domainName: domain.name });
}
