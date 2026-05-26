"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { BookOpen, Briefcase, Newspaper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  "software-engineering": <BookOpen className="h-8 w-8" />,
  finance: <Briefcase className="h-8 w-8" />,
  journalism: <Newspaper className="h-8 w-8" />,
};

interface Domain {
  id: string;
  name: string;
  slug: string;
}

export default function DomainSelectPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const { data: domains, isLoading } = useSWR<Domain[]>("/api/domains", fetcher);
  const [selecting, setSelecting] = useState<string | null>(null);

  async function handleSelect(domain: Domain) {
    setSelecting(domain.id);
    const res = await fetch("/api/domains/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId: domain.id }),
    });

    if (res.ok) {
      await updateSession({ activeDomainId: domain.id });
      router.push("/questions");
      router.refresh();
    }
    setSelecting(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Choose Your Domain
          </h1>
          <p className="text-muted-foreground mt-2">
            Select the area you want to prepare for. You can change this later
            in your profile settings.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {domains?.map((domain) => (
              <Card
                key={domain.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                  selecting === domain.id && "border-primary opacity-70"
                )}
                onClick={() => !selecting && handleSelect(domain)}
              >
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className="text-muted-foreground">
                    {DOMAIN_ICONS[domain.slug] ?? <BookOpen className="h-8 w-8" />}
                  </div>
                  <span className="text-lg font-semibold">{domain.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
