"use client";

import { useRef, useEffect } from "react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

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
      const result = lowlight.highlightAuto(text);
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
