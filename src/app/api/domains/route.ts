import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const domains = await prisma.domain.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json(domains);
}
