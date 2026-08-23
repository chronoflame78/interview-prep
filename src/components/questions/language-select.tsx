"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/constants";
import { CONTENT_LANG_LABELS, normalizeLang } from "@/lib/language";
import { useDisplayLanguage } from "@/lib/use-display-language";
import { cn } from "@/lib/utils";

const LANG_ITEMS: Record<string, string> = CONTENT_LANG_LABELS;

interface QuestionLanguageSelectProps {
  className?: string;
}

/**
 * Chooses which language variant the cards display. The value is display-only
 * state — no server data depends on it — so it is written with a shallow
 * `pushState` rather than `router.push`, which would re-run the whole
 * server-side read pass to produce an identical result set.
 */
export function QuestionLanguageSelect({
  className,
}: QuestionLanguageSelectProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = useDisplayLanguage();

  function handleChange(value: string | null) {
    const next = normalizeLang(value);
    const params = new URLSearchParams(searchParams.toString());
    // English is the default, so it clears the parameter instead of writing it
    // — the same "clean URL" convention the filter controls use for "all".
    if (next === "en") params.delete("lang");
    else params.set("lang", next);
    params.delete("page");

    const query = params.toString();
    // pushState integrates with the Next router, so `useSearchParams` — and
    // therefore every mounted card — re-renders without a request.
    window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Select items={LANG_ITEMS} value={lang} onValueChange={handleChange}>
      <SelectTrigger
        className={cn("w-[150px]", className)}
        title="Display language"
      >
        <Languages className="text-muted-foreground h-4 w-4" />
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.key} value={l.key}>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
