"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Domain {
  id: string;
  name: string;
  slug: string;
}

export function DomainBadge() {
  const { data: session } = useSession();
  const { data: domains } = useSWR<Domain[]>("/api/domains", fetcher);

  const activeDomain = domains?.find(
    (d) => d.id === session?.user?.activeDomainId
  );

  if (!activeDomain) return null;

  return (
    <Badge variant="secondary" className="hidden text-xs md:inline-flex">
      {activeDomain.name}
    </Badge>
  );
}
