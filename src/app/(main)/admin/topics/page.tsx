import { TopicList } from "@/components/topics/topic-list";

export default function AdminTopicsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Admin: Default Topics
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage default topics and sub-topics visible to all users.
        </p>
      </div>
      <TopicList isAdmin />
    </div>
  );
}
