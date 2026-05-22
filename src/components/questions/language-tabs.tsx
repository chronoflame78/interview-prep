"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LANGUAGES } from "@/lib/constants";

interface LanguageTabsProps {
  children: (langKey: string) => React.ReactNode;
  defaultValue?: string;
}

export function LanguageTabs({
  children,
  defaultValue = "en",
}: LanguageTabsProps) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList>
        {LANGUAGES.map((lang) => (
          <TabsTrigger key={lang.key} value={lang.key}>
            {lang.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {LANGUAGES.map((lang) => (
        <TabsContent key={lang.key} value={lang.key} className="mt-4">
          {children(lang.key)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
