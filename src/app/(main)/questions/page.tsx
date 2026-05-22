import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getQuestionsForUser } from "@/lib/questions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionFilters } from "@/components/questions/question-filters";
import { QuestionList } from "@/components/questions/question-list";
import type { Difficulty } from "@/generated/prisma/enums";
import type { QuestionFilters as QFilters } from "@/types";

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function QuestionsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const filters: QFilters = {
    difficulty: params.difficulty as Difficulty | undefined,
    topicId: params.topicId,
    subTopicId: params.subTopicId,
    search: params.search,
    showOnly: params.showOnly as QFilters["showOnly"],
    sort: params.sort ?? "date:desc",
    page: params.page ? Number(params.page) : 1,
  };

  const questions = await getQuestionsForUser(session.user.id, filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Questions</h1>
          <p className="text-muted-foreground text-sm">
            {questions.length} question{questions.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link href="/questions/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Add Question
        </Link>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <QuestionFilters />
      </Suspense>

      <QuestionList questions={questions} />
    </div>
  );
}
