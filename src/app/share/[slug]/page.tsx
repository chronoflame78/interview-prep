import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getQuestionsForUser } from "@/lib/questions";
import { QuestionList } from "@/components/questions/question-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SharedProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const targetUser = await prisma.user.findUnique({
    where: { shareSlug: slug },
    select: { id: true, name: true, email: true, activeDomainId: true, activeDomain: { select: { name: true } } },
  });

  if (!targetUser) notFound();

  const questions = await getQuestionsForUser(targetUser.id, {}, targetUser.activeDomainId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {targetUser.name ?? "User"}&apos;s Questions
        </h1>
        <p className="text-muted-foreground text-sm">
          Viewing shared collection &middot; {questions.length} question
          {questions.length !== 1 ? "s" : ""}
        </p>
      </div>
      <QuestionList questions={questions} readOnly />
    </div>
  );
}
