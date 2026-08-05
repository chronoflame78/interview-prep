"use client";

import { useRef, useEffect } from "react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

// Editor code blocks only carry a `language-*` class when one was set
// explicitly. `highlightAuto` mis-detects short snippets, so default rather
// than guess — this must match the editor's `defaultLanguage`. `typescript`
// extends the `javascript` grammar, so plain JS highlights identically while
// TS-only syntax still resolves.
const DEFAULT_LANGUAGE = "typescript";

function languageOf(code: Element) {
  const match = /(?:^|\s)language-(\S+)/.exec(code.getAttribute("class") ?? "");
  const language = match?.[1];
  return language && lowlight.registered(language)
    ? language
    : DEFAULT_LANGUAGE;
}

interface HighlightedHtmlProps {
  html: string;
  className?: string;
}

export function HighlightedHtml({ html, className }: HighlightedHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const codeBlocks = ref.current.querySelectorAll("pre code");
    for (const block of codeBlocks) {
      const text = block.textContent ?? "";
      const result = lowlight.highlight(languageOf(block), text);
      block.innerHTML = toHtml(result.children);
      block.classList.add("hljs");
    }
  }, [html]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
