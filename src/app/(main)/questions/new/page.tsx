import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { QuestionForm } from "@/components/questions/question-form";

export default async function NewQuestionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Question</h1>
        <p className="text-muted-foreground text-sm">
          Create a new question for your collection.
        </p>
      </div>
      <QuestionForm isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
