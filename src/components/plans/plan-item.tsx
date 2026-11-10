"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  FolderInput,
  GripVertical,
  MoreVertical,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuestionCard } from "@/components/questions/question-card";
import { cn } from "@/lib/utils";
import type { QuestionWithRelations } from "@/types";

export interface MoveTarget {
  index: number;
  name: string;
}

export interface ItemActions {
  onStep: (itemId: string, dir: -1 | 1) => void;
  onMoveTo: (itemId: string, sectionIndex: number) => void;
  onRemove: (itemId: string) => void;
}

interface PlanItemProps {
  itemId: string;
  question: QuestionWithRelations;
  number: number;
  canUp: boolean;
  canDown: boolean;
  /** Sections the item can be moved to (its own section excluded). */
  moveTargets: MoveTarget[];
  actions: ItemActions;
}

export function PlanItem({
  itemId,
  question,
  number,
  canUp,
  canDown,
  moveTargets,
  actions,
}: PlanItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId, data: { type: "item" } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-start gap-1", isDragging && "opacity-40")}
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-1 pt-3">
        <span className="text-muted-foreground text-xs font-medium tabular-nums">
          {number}
        </span>
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Drag question ${number}`}
          className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-grab touch-none rounded p-1 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Actions for question ${number}`}
              />
            }
          >
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem disabled={!canUp} onClick={() => actions.onStep(itemId, -1)}>
              <ArrowUp className="mr-2 h-4 w-4" />
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canDown} onClick={() => actions.onStep(itemId, 1)}>
              <ArrowDown className="mr-2 h-4 w-4" />
              Move down
            </DropdownMenuItem>
            {moveTargets.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Move to group…
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  {moveTargets.map((t) => (
                    <DropdownMenuItem
                      key={t.index}
                      onClick={() => actions.onMoveTo(itemId, t.index)}
                    >
                      <span className="truncate">{t.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => actions.onRemove(itemId)}
            >
              <X className="mr-2 h-4 w-4" />
              Remove from plan
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="min-w-0 flex-1">
        {/* No onDelete: the card's trash would delete/reset the question itself. */}
        <QuestionCard question={question} />
      </div>
    </div>
  );
}
