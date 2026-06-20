"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTIES } from "@/lib/constants";

const difficultyLabel = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

const DIFFICULTY_ITEMS: Record<string, string> = {
  all: "All Levels",
  ...Object.fromEntries(DIFFICULTIES.map((d) => [d, difficultyLabel(d)])),
};

const SHOW_ONLY_ITEMS: Record<string, string> = {
  all: "All Questions",
  defaults: "Default Only",
  mine: "My Questions",
};

const SORT_ITEMS: Record<string, string> = {
  "date:desc": "Newest First",
  "date:asc": "Oldest First",
  "difficulty:asc": "Easy to Hard",
  "difficulty:desc": "Hard to Easy",
};

export function QuestionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/questions?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      const timeout = setTimeout(() => updateParam("search", value || null), 300);
      return () => clearTimeout(timeout);
    },
    [updateParam]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[200px] flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search questions..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        items={DIFFICULTY_ITEMS}
        value={searchParams.get("difficulty") ?? "all"}
        onValueChange={(v) => updateParam("difficulty", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          {DIFFICULTIES.map((d) => (
            <SelectItem key={d} value={d}>
              {difficultyLabel(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={SHOW_ONLY_ITEMS}
        value={searchParams.get("showOnly") ?? "all"}
        onValueChange={(v) => updateParam("showOnly", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Show" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Questions</SelectItem>
          <SelectItem value="defaults">Default Only</SelectItem>
          <SelectItem value="mine">My Questions</SelectItem>
        </SelectContent>
      </Select>

      <Select
        items={SORT_ITEMS}
        value={searchParams.get("sort") ?? "date:desc"}
        onValueChange={(v) => updateParam("sort", v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date:desc">Newest First</SelectItem>
          <SelectItem value="date:asc">Oldest First</SelectItem>
          <SelectItem value="difficulty:asc">Easy to Hard</SelectItem>
          <SelectItem value="difficulty:desc">Hard to Easy</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
