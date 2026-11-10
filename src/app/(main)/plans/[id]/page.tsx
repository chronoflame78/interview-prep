import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getPlanForUser } from "@/lib/plans";
import { PlanBoard } from "@/components/plans/plan-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PlanPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const plan = await getPlanForUser(
    session.user.id,
    id,
    session.user.activeDomainId ?? null
  );
  if (!plan) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/plans"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="h-4 w-4" />
        All plans
      </Link>
      <PlanBoard plan={plan} />
    </div>
  );
}
