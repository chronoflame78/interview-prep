import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuestionList } from "@/components/questions/question-list";
import type { QuestionWithRelations } from "@/types";

export default async function AdminQuestionsPage() {
  const questions = await prisma.question.findMany({
    where: { isDefault: true },
    include: {
      topics: { include: { topic: true } },
      subTopics: { include: { subTopic: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped: QuestionWithRelations[] = questions.map((q) => ({
    ...q,
    hasOverride: false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin: Default Questions
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage questions visible to all users.
          </p>
        </div>
        <Link href="/questions/new" className={cn(buttonVariants(), "gap-2")}>
          <Plus className="h-4 w-4" />
          Add Default Question
        </Link>
      </div>
      <QuestionList questions={mapped} />
    </div>
  );
}
