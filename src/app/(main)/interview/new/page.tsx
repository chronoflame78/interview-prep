import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SessionConfigForm } from "@/components/interview/session-config-form";

export default async function NewInterviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configure mock interview
        </h1>
        <p className="text-muted-foreground text-sm">
          Pick how questions are chosen and how the interviewer behaves.
        </p>
      </div>

      <SessionConfigForm />
    </div>
  );
}
