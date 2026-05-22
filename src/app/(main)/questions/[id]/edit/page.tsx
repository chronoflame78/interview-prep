import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getQuestionForUser } from "@/lib/questions";
import { prisma } from "@/lib/prisma";
import { QuestionForm } from "@/components/questions/question-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditQuestionPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const original = await prisma.question.findUnique({ where: { id } });
  if (!original) notFound();

  const question = await getQuestionForUser(session.user.id, id);
  if (!question) notFound();

  const isOverride =
    original.isDefault && original.createdBy !== session.user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isOverride ? "Customize Question" : "Edit Question"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isOverride
            ? "Your changes will only be visible to you."
            : "Update your question details."}
        </p>
      </div>
      <QuestionForm
        question={question}
        isOverride={isOverride}
        isAdmin={session.user.role === "ADMIN"}
      />
    </div>
  );
}
