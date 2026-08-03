"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { common, createLowlight } from "lowlight";
import { cn } from "@/lib/utils";
import { Toolbar } from "./toolbar";

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = "Start typing...",
  editable = true,
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: { class: "bg-muted rounded-md p-4 font-mono text-sm" },
      }),
      Placeholder.configure({ placeholder }),
      TableKit.configure({
        table: { resizable: true, renderWrapper: true },
      }),
    ],
    content,
    editable,
    // Without this, ProseMirror applies HTML's whitespace-collapsing rules when
    // it parses saved content, so "hello   world" comes back as "hello world".
    // View mode renders with `white-space: pre-wrap`, so parse to match it.
    parseOptions: { preserveWhitespace: "full" },
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  return (
    <div
      className={cn(
        "border-input bg-background rounded-md border",
        className
      )}
    >
      {editable && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2",
          "[&_.tiptap]:min-h-[120px] [&_.tiptap]:outline-none",
          "[&_.tiptap_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
        )}
      />
    </div>
  );
}
