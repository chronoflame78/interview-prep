"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANG_OPTIONS = [
  { lang: "en", label: "English" },
  { lang: "vn", label: "Vietnamese" },
  { lang: "cus", label: "Custom" },
] as const;

export function ExportQuestionsButton() {
  const searchParams = useSearchParams();
  const [exporting, setExporting] = useState(false);

  async function handleExport(lang: string, includeAnswers: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.set("lang", lang);
    if (!includeAnswers) params.set("answers", "false");

    setExporting(true);
    try {
      const res = await fetch(`/api/questions/export?${params.toString()}`);
      if (!res.ok) throw new Error();

      const filename =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "questions.md";

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="gap-2" disabled={exporting} />}
        >
          <Download className="h-4 w-4" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Questions & answers</DropdownMenuLabel>
            {LANG_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.lang}
                onClick={() => handleExport(o.lang, true)}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Questions only</DropdownMenuLabel>
            {LANG_OPTIONS.map((o) => (
              <DropdownMenuItem
                key={o.lang}
                onClick={() => handleExport(o.lang, false)}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {exporting && (
        <div className="bg-background/80 fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
          <Loader2Icon className="text-primary h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Preparing export…</p>
        </div>
      )}
    </>
  );
}
