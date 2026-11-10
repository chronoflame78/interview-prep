"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AlertTriangle,
  FolderPlus,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuestionLanguageSelect } from "@/components/questions/language-select";
import { pickTitle } from "@/lib/language";
import { useDisplayLanguage } from "@/lib/use-display-language";
import { DeleteGroupDialog, GroupNameDialog } from "./group-dialogs";
import { PlanFormDialog } from "./plan-form-dialog";
import { QuestionPicker, type PickerTarget } from "./question-picker";
import {
  DndActive,
  SortableGroupSection,
  UngroupedDropBar,
  UngroupedSection,
} from "./plan-section";
import type { ItemActions, MoveTarget } from "./plan-item";
import {
  findItemSection,
  groupDndId,
  isVisible,
  moveGroup,
  moveItem,
  sameLayout,
  sectionKey,
  stepItem,
  toLayout,
  UNGROUPED_KEY,
} from "./layout-state";
import type { PlanSectionView, PlanView } from "@/types";

const LAYOUT_CONFLICT = 409;

/** Item drags may land on items or section drop zones; group drags only on groups. */
const collisionDetection: CollisionDetection = (args) => {
  const isGroupDrag = args.active.data.current?.type === "group";
  const droppableContainers = args.droppableContainers.filter((c) =>
    isGroupDrag
      ? c.data.current?.type === "group"
      : c.data.current?.type !== "group"
  );
  const scoped = { ...args, droppableContainers };
  if (isGroupDrag) return closestCenter(scoped);

  const hits = pointerWithin(scoped);
  // The floating Ungrouped drop bar sits above the cards; it wins when hovered.
  const priority = hits.filter(
    (h) => h.data?.droppableContainer?.data.current?.priority
  );
  if (priority.length > 0) return priority;
  if (hits.length > 0) {
    const onItems = hits.filter(
      (h) => h.data?.droppableContainer?.data.current?.type === "item"
    );
    return onItems.length > 0 ? onItems : hits;
  }
  // No pointer (keyboard drag): step between cards, not onto section zones,
  // or arrow keys would land on the card's own section and change nothing.
  const nearestItems = closestCenter({
    ...args,
    droppableContainers: droppableContainers.filter(
      (c) => c.data.current?.type === "item"
    ),
  });
  return nearestItems.length > 0 ? nearestItems : closestCenter(scoped);
};

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function PlanBoard({ plan }: { plan: PlanView }) {
  const router = useRouter();
  const lang = useDisplayLanguage();

  // Local, optimistic copy of the arrangement. Reseeded whenever the server
  // sends a new plan (after router.refresh()).
  const [seed, setSeed] = useState(plan);
  const [sections, setSections] = useState(plan.sections);
  if (plan !== seed) {
    setSeed(plan);
    setSections(plan.sections);
  }

  const lastSavedRef = useRef(plan.sections);
  useEffect(() => {
    lastSavedRef.current = plan.sections;
  }, [plan]);

  // Layout saves run one at a time, in order. A failure bumps the generation
  // so saves queued behind it (built on the rejected state) are dropped.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const genRef = useRef(0);

  function save(next: PlanSectionView[]) {
    const gen = genRef.current;
    const body = JSON.stringify(toLayout(next));
    queueRef.current = queueRef.current.then(async () => {
      if (gen !== genRef.current) return;
      let status = 0;
      try {
        const res = await fetch(`/api/plans/${plan.id}/layout`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        status = res.status;
        if (!res.ok) throw new Error();
        lastSavedRef.current = next;
      } catch {
        genRef.current++;
        setSections(lastSavedRef.current);
        toast.error("Failed to save order");
        if (status === LAYOUT_CONFLICT) router.refresh();
      }
    });
  }

  function apply(next: PlanSectionView[]) {
    if (next === sections) return;
    setSections(next);
    save(next);
  }

  /** Run a non-layout write after pending layout saves, then refresh. */
  async function mutate(
    url: string,
    init: RequestInit,
    success: string | ((data: Record<string, unknown>) => string)
  ): Promise<boolean> {
    await queueRef.current;
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error || "Something went wrong");
      return false;
    }
    toast.success(typeof success === "string" ? success : success(data));
    router.refresh();
    return true;
  }

  // ─── Derived view data ───

  const groupCount = sections.length - 1;
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const s of sections) for (const i of s.items) if (isVisible(i)) map.set(i.id, ++n);
    return map;
  }, [sections]);
  const totalVisible = numbers.size;

  const moveTargets: MoveTarget[] = sections.map((s, index) => ({ index, name: s.name }));
  const pickerTargets: PickerTarget[] = sections.map((s) => ({
    key: sectionKey(s.id),
    name: s.name,
  }));
  const inPlan = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sections) for (const i of s.items) map.set(i.questionId, s.name);
    return map;
  }, [sections]);

  const canAdd = !plan.isForeignDomain;

  // ─── UI state ───

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState<PlanSectionView | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<PlanSectionView | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);

  function toggleCollapse(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ─── Drag and drop ───

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press-and-hold on touch so a normal swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [activeDrag, setActiveDrag] = useState<{
    id: string;
    type: "item" | "group";
    /** Whether Ungrouped was on screen when the drag began; frozen for the drag. */
    ungroupedShown: boolean;
  } | null>(null);
  const dragStartRef = useRef<PlanSectionView[] | null>(null);

  function sectionIndexOfGroupDndId(id: string) {
    return sections.findIndex((s) => s.id !== null && groupDndId(s.id) === id);
  }

  function handleDragStart({ active }: DragStartEvent) {
    const type = active.data.current?.type === "group" ? "group" : "item";
    setActiveDrag({
      id: String(active.id),
      type,
      ungroupedShown: sections[0].items.some(isVisible),
    });
    dragStartRef.current = sections;
  }

  // Cross-section moves happen live while dragging so the target list opens
  // a gap; same-section reordering is finalized on drop.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.data.current?.type !== "item") return;
    const activeId = String(active.id);
    const overId = String(over.id);
    setSections((prev) => {
      const from = findItemSection(prev, activeId);
      let to: number;
      let index: number;
      if (over.data.current?.type === "section") {
        to = over.data.current.sectionIndex as number;
        index = prev[to]?.items.length ?? 0;
      } else if (over.data.current?.type === "item") {
        to = findItemSection(prev, overId);
        index = to === -1 ? 0 : prev[to].items.findIndex((i) => i.id === overId);
      } else {
        return prev;
      }
      if (from === -1 || to === -1 || from === to) return prev;
      return moveItem(prev, activeId, to, index);
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    setActiveDrag(null);
    if (!start) return;
    if (!over) {
      setSections(start);
      return;
    }

    let next = sections;
    if (active.data.current?.type === "group") {
      next = moveGroup(
        sections,
        sectionIndexOfGroupDndId(String(active.id)),
        sectionIndexOfGroupDndId(String(over.id))
      );
    } else if (over.data.current?.type === "item") {
      const activeId = String(active.id);
      const s = findItemSection(sections, activeId);
      const overIndex = sections[s]?.items.findIndex((i) => i.id === String(over.id)) ?? -1;
      if (s !== -1 && overIndex !== -1) next = moveItem(sections, activeId, s, overIndex);
    }

    setSections(next);
    if (!sameLayout(start, next)) save(next);
  }

  function handleDragCancel() {
    if (dragStartRef.current) setSections(dragStartRef.current);
    dragStartRef.current = null;
    setActiveDrag(null);
  }

  const activeItem =
    activeDrag?.type === "item"
      ? sections.flatMap((s) => s.items).find((i) => i.id === activeDrag.id)
      : undefined;
  const activeGroup =
    activeDrag?.type === "group"
      ? sections[sectionIndexOfGroupDndId(activeDrag.id)]
      : undefined;

  // ─── Actions ───

  const itemActions: ItemActions = {
    onStep: (itemId, dir) => apply(stepItem(sections, itemId, dir)),
    onMoveTo: (itemId, sectionIndex) =>
      apply(moveItem(sections, itemId, sectionIndex, sections[sectionIndex].items.length)),
    onRemove: (itemId) =>
      mutate(`/api/plans/${plan.id}/items/${itemId}`, { method: "DELETE" }, "Removed from plan"),
  };

  const groupActions = {
    onRename: (i: number) => setRenamingGroup(sections[i]),
    onStep: (i: number, dir: -1 | 1) => apply(moveGroup(sections, i, i + dir)),
    onAddQuestions: (i: number) => setPickerTarget(sectionKey(sections[i].id)),
    onDelete: (i: number) => {
      const group = sections[i];
      // A group with no visible questions is deleted without asking; any
      // hidden items are kept by moving them to Ungrouped.
      if (group.items.filter(isVisible).length === 0) {
        deleteGroup(group, "move");
      } else {
        setDeletingGroup(group);
      }
    },
  };

  async function deleteGroup(group: PlanSectionView, mode: "move" | "remove") {
    const ok = await mutate(
      `/api/plans/${plan.id}/groups/${group.id}?items=${mode}`,
      { method: "DELETE" },
      "Group deleted"
    );
    if (ok) setDeletingGroup(null);
  }

  async function addQuestions(questionIds: string[], targetKey: string) {
    const ok = await mutate(
      `/api/plans/${plan.id}/items`,
      {
        method: "POST",
        body: JSON.stringify({
          questionIds,
          groupId: targetKey === UNGROUPED_KEY ? null : targetKey,
        }),
      },
      (data) => {
        const added = (data.added as string[] | undefined)?.length ?? 0;
        const skipped = (data.skipped as string[] | undefined)?.length ?? 0;
        const msg = `Added ${added} question${added === 1 ? "" : "s"}`;
        return skipped ? `${msg} (${skipped} already in plan)` : msg;
      }
    );
    if (ok) setPickerTarget(null);
    return ok;
  }

  async function deletePlan() {
    if (!confirm(`Delete the plan "${plan.name}"? Questions are not affected.`)) return;
    await queueRef.current;
    const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Something went wrong");
      return;
    }
    toast.success("Plan deleted");
    router.push("/plans");
    router.refresh();
  }

  // ─── Render ───

  const isEmpty = groupCount === 0 && totalVisible === 0;
  const ungrouped = sections[0];
  // While dragging, keep Ungrouped exactly as it was at drag start so moving
  // its last card out (or a card in) never reflows the page mid-drag.
  // `dndActive` comes from dnd-kit itself: a drag that ends before dnd-kit
  // finishes starting it fires no onDragEnd, and must not leave this UI stuck.
  const ungroupedLayout = (dndActive: boolean) => {
    const drag = dndActive ? activeDrag : null;
    const showUngrouped = drag ? drag.ungroupedShown : ungrouped.items.some(isVisible);
    return { showUngrouped, showDropBar: !showUngrouped && drag?.type === "item" };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight break-words">{plan.name}</h1>
          {plan.description && (
            <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
              {plan.description}
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-xs">
            {totalVisible} question{totalVisible !== 1 ? "s" : ""} · {groupCount} group
            {groupCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <QuestionLanguageSelect />
          <Button variant="outline" className="gap-2" onClick={() => setAddingGroup(true)}>
            <FolderPlus className="h-4 w-4" />
            Add group
          </Button>
          <Button
            className="gap-2"
            disabled={!canAdd}
            title={canAdd ? undefined : "Switch to this plan's domain to add questions"}
            onClick={() => setPickerTarget(UNGROUPED_KEY)}
          >
            <ListPlus className="h-4 w-4" />
            Add questions
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" aria-label="Plan actions" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setEditingPlan(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={deletePlan}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {plan.isForeignDomain && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This plan belongs to another domain. You can study and rearrange it, but
            switch to its domain to add questions.
          </p>
        </div>
      )}

      {isEmpty ? (
        <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
          <p className="text-foreground text-lg">This plan is empty</p>
          <p className="text-sm">Add questions, and optionally organize them into groups.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setAddingGroup(true)}>
              <FolderPlus className="h-4 w-4" />
              Add group
            </Button>
            <Button
              className="gap-2"
              disabled={!canAdd}
              onClick={() => setPickerTarget(UNGROUPED_KEY)}
            >
              <ListPlus className="h-4 w-4" />
              Add questions
            </Button>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <DndActive>
            {(dndActive) => (
              <>
                {ungroupedLayout(dndActive).showDropBar && <UngroupedDropBar />}
                <div className="space-y-8">
                  {ungroupedLayout(dndActive).showUngrouped && (
                    <UngroupedSection
                      section={ungrouped}
                      sectionIndex={0}
                      groupCount={groupCount}
                      numbers={numbers}
                      collapsed={collapsed.has(UNGROUPED_KEY)}
                      onToggleCollapse={() => toggleCollapse(UNGROUPED_KEY)}
                      moveTargets={moveTargets}
                      itemActions={itemActions}
                      groupActions={groupActions}
                      canAdd={canAdd}
                    />
                  )}
                  <SortableContext
                    items={sections.slice(1).map((s) => groupDndId(s.id as string))}
                    strategy={verticalListSortingStrategy}
                  >
                    {sections.slice(1).map((s, i) => (
                      <SortableGroupSection
                        key={s.id}
                        section={s}
                        sectionIndex={i + 1}
                        groupCount={groupCount}
                        numbers={numbers}
                        collapsed={collapsed.has(sectionKey(s.id))}
                        onToggleCollapse={() => toggleCollapse(sectionKey(s.id))}
                        moveTargets={moveTargets}
                        itemActions={itemActions}
                        groupActions={groupActions}
                        canAdd={canAdd}
                      />
                    ))}
                  </SortableContext>
                </div>
              </>
            )}
          </DndActive>
          <DragOverlay>
            {activeItem?.question ? (
              <div className="bg-popover max-w-xl rounded-md border p-3 text-sm shadow-lg">
                <span className="line-clamp-2">
                  {stripHtml(pickTitle(activeItem.question, lang))}
                </span>
              </div>
            ) : activeGroup ? (
              <div className="bg-popover max-w-xl rounded-md border p-3 font-semibold shadow-lg">
                {activeGroup.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <QuestionPicker
        open={pickerTarget !== null}
        onOpenChange={(o) => !o && setPickerTarget(null)}
        targets={pickerTargets}
        initialTarget={pickerTarget ?? UNGROUPED_KEY}
        inPlan={inPlan}
        onAdd={addQuestions}
      />

      <GroupNameDialog
        open={addingGroup}
        onOpenChange={setAddingGroup}
        title="New group"
        submitLabel="Add group"
        onSubmit={(name) =>
          mutate(
            `/api/plans/${plan.id}/groups`,
            { method: "POST", body: JSON.stringify({ name }) },
            "Group added"
          )
        }
      />

      <GroupNameDialog
        open={renamingGroup !== null}
        onOpenChange={(o) => !o && setRenamingGroup(null)}
        title="Rename group"
        submitLabel="Save"
        initialName={renamingGroup?.name}
        onSubmit={(name) =>
          mutate(
            `/api/plans/${plan.id}/groups/${renamingGroup?.id}`,
            { method: "PATCH", body: JSON.stringify({ name }) },
            "Group renamed"
          )
        }
      />

      <DeleteGroupDialog
        open={deletingGroup !== null}
        onOpenChange={(o) => !o && setDeletingGroup(null)}
        groupName={deletingGroup?.name ?? ""}
        questionCount={deletingGroup?.items.filter(isVisible).length ?? 0}
        onConfirm={(mode) => (deletingGroup ? deleteGroup(deletingGroup, mode) : Promise.resolve())}
      />

      <PlanFormDialog
        open={editingPlan}
        onOpenChange={setEditingPlan}
        title="Edit plan"
        submitLabel="Save"
        initialName={plan.name}
        initialDescription={plan.description}
        onSubmit={(values) =>
          mutate(
            `/api/plans/${plan.id}`,
            { method: "PATCH", body: JSON.stringify(values) },
            "Plan updated"
          )
        }
      />
    </div>
  );
}
