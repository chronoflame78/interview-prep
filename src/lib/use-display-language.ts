// The reading surface's language choice lives in the URL (`?lang=`), so it is
// shareable and survives a refresh without being stored per user. Client
// components read it here; `QuestionLanguageSelect` is the only writer.

import { useSearchParams } from "next/navigation";

import { normalizeLang, type ContentLang } from "@/lib/language";

export function useDisplayLanguage(): ContentLang {
  return normalizeLang(useSearchParams().get("lang"));
}
