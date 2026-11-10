import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPlansForUser } from "@/lib/plans";
import { PlanList } from "@/components/plans/plan-list";

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await getPlansForUser(
    session.user.id,
    session.user.activeDomainId ?? null
  );

  return <PlanList plans={plans} />;
}
