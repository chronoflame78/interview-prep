import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TopicList } from "@/components/topics/topic-list";

export default async function TopicsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground text-sm">
          Manage your topics and sub-topics to organize questions.
        </p>
      </div>
      <TopicList isAdmin={session.user.role === "ADMIN"} />
    </div>
  );
}
