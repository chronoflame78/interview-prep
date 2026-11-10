"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PlanItem, type ItemActions, type MoveTarget } from "./plan-item";
import {
  canStepItem,
  groupDndId,
  isVisible,
  sectionDropId,
} from "./layout-state";
import type { PlanSectionView } from "@/types";

export interface GroupActions {
  onRename: (sectionIndex: number) => void;
  onDelete: (sectionIndex: number) => void;
  onStep: (sectionIndex: number, dir: -1 | 1) => void;
  onAddQuestions: (sectionIndex: number) => void;
}

interface PlanSectionProps {
  section: PlanSectionView;
  sectionIndex: number;
  groupCount: number;
  numbers: Map<string, number>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  moveTargets: MoveTarget[];
  itemActions: ItemActions;
  groupActions: GroupActions;
  canAdd: boolean;
}

/** A named group: sortable among groups via its header handle. */
export function SortableGroupSection(props: PlanSectionProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: groupDndId(props.section.id as string),
      data: { type: "group" },
    });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <SectionBody
        {...props}
        handle={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            type="button"
            aria-label={`Drag group ${props.section.name}`}
            className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-grab touch-none rounded p-1 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

/** Renders `children(isDragging)` from dnd-kit's own notion of an active drag. */
export function DndActive({
  children,
}: {
  children: (dndActive: boolean) => React.ReactNode;
}) {
  const { active } = useDndContext();
  return <>{children(active !== null)}</>;
}

/**
 * Drop target for an *empty* Ungrouped section while an item is dragged.
 * It floats over the page instead of being inserted into the flow, so starting
 * a drag never shifts the sections the user is aiming at.
 */
export function UngroupedDropBar() {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDropId(null),
    data: { type: "section", sectionIndex: 0, priority: true },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-popover fixed top-16 left-1/2 z-40 w-[min(90vw,28rem)] -translate-x-1/2 rounded-md border-2 border-dashed px-4 py-3 text-center text-sm shadow-lg transition-colors",
        isOver ? "border-primary bg-accent" : "text-muted-foreground"
      )}
    >
      Drop here to move to Ungrouped
    </div>
  );
}

/** The built-in Ungrouped section: fixed in place, no rename/delete. */
export function UngroupedSection(props: PlanSectionProps) {
  return <SectionBody {...props} />;
}

function SectionBody({
  section,
  sectionIndex,
  groupCount,
  numbers,
  collapsed,
  onToggleCollapse,
  moveTargets,
  itemActions,
  groupActions,
  canAdd,
  handle,
}: PlanSectionProps & { handle?: React.ReactNode }) {
  const isGroup = section.id !== null;
  const visibleItems = section.items.filter(isVisible);
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDropId(section.id),
    data: { type: "section", sectionIndex },
  });

  return (
    <section className="space-y-2" aria-label={section.name}>
      <div className="flex items-center gap-1 border-b pb-1">
        {handle}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className="hover:bg-accent flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-1 text-left"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
          <h2
            className={cn(
              "truncate font-semibold",
              !isGroup && "text-muted-foreground"
            )}
          >
            {section.name}
          </h2>
          <span className="text-muted-foreground ml-1 shrink-0 text-xs">
            {visibleItems.length}
          </span>
        </button>
        {isGroup && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`Actions for group ${section.name}`}
                />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={!canAdd}
                onClick={() => groupActions.onAddQuestions(sectionIndex)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => groupActions.onRename(sectionIndex)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={sectionIndex <= 1}
                onClick={() => groupActions.onStep(sectionIndex, -1)}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Move group up
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={sectionIndex >= groupCount}
                onClick={() => groupActions.onStep(sectionIndex, 1)}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Move group down
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => groupActions.onDelete(sectionIndex)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "min-h-12 space-y-3 rounded-md transition-colors",
          isOver && "bg-accent/50"
        )}
      >
        {!collapsed && (
          <SortableContext
            items={visibleItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {visibleItems.map((item) => (
              <PlanItem
                key={item.id}
                itemId={item.id}
                question={item.question!}
                number={numbers.get(item.id) ?? 0}
                canUp={canStepItem(section, item.id, -1)}
                canDown={canStepItem(section, item.id, 1)}
                moveTargets={moveTargets.filter((t) => t.index !== sectionIndex)}
                actions={itemActions}
              />
            ))}
          </SortableContext>
        )}
        {!collapsed && visibleItems.length === 0 && (
          <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-sm">
            No questions yet — drag questions here or use &ldquo;Add questions&rdquo;.
          </p>
        )}
      </div>
    </section>
  );
}
