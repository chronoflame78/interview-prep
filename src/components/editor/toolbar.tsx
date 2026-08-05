"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Braces,
  ChevronDown,
  Code,
  FileCode,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  editor: Editor;
}

// Values must be names or aliases lowlight has registered, otherwise the
// code-block extension silently falls back to `highlightAuto`. TypeScript is
// the extension's `defaultLanguage` and its grammar is a superset of
// JavaScript's, so it covers both.
const CODE_LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
] as const;

function ToolbarButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "hover:bg-accent rounded p-1.5 transition-colors",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}

function LanguageMenu({ editor }: ToolbarProps) {
  const inCodeBlock = editor.isActive("codeBlock");
  // Falls back to the extension's `defaultLanguage` for blocks saved before
  // the language attribute existed.
  const current =
    (editor.getAttributes("codeBlock").language as string | null) ??
    "typescript";
  const label =
    CODE_LANGUAGES.find((l) => l.value === current)?.label ?? current;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            title="Code block language"
            disabled={!inCodeBlock}
            className={cn(
              "hover:bg-accent flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
              inCodeBlock && "bg-accent text-accent-foreground"
            )}
          />
        }
      >
        <FileCode className="h-4 w-4" />
        <span>{inCodeBlock ? label : "Language"}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) =>
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", { language: value as string })
              .run()
          }
        >
          {CODE_LANGUAGES.map((language) => (
            <DropdownMenuRadioItem key={language.value} value={language.value}>
              {language.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TableMenu({ editor }: ToolbarProps) {
  const inTable = editor.isActive("table");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            title="Table"
            className={cn(
              "hover:bg-accent rounded p-1.5 transition-colors",
              inTable && "bg-accent text-accent-foreground"
            )}
          />
        }
      >
        <TableIcon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Insert table
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          Add row above
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          Add row below
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          Delete row
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          Add column left
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          Add column right
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          Delete column
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          Toggle header row
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().mergeOrSplit().run()}
        >
          Merge / split cells
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Toolbar({ editor }: ToolbarProps) {
  const iconSize = "h-4 w-4";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline"
      >
        <Underline className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline Code (Ctrl+E)"
      >
        <Code className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Braces className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote className={iconSize} />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <LanguageMenu editor={editor} />
      <TableMenu editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
      >
        <Undo className={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
      >
        <Redo className={iconSize} />
      </ToolbarButton>
    </div>
  );
}
