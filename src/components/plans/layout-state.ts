// Pure helpers over the board's section state. Every move works on the full
// item arrays — hidden items (question: null) included — so a hidden item keeps
// its place relative to its neighbours and the saved layout always lists every
// item, as PUT /layout requires.

import { arrayMove } from "@dnd-kit/sortable";
import type { PlanItemView, PlanLayout, PlanSectionView } from "@/types";

/** Stable dnd-kit ids. Item ids are raw cuids; groups and drop zones are prefixed. */
export const UNGROUPED_KEY = "ungrouped";
export const groupDndId = (groupId: string) => `group:${groupId}`;
export const sectionDropId = (sectionId: string | null) =>
  `section:${sectionId ?? UNGROUPED_KEY}`;
export const sectionKey = (sectionId: string | null) => sectionId ?? UNGROUPED_KEY;

export const isVisible = (item: PlanItemView) => item.question !== null;

export function toLayout(sections: PlanSectionView[]): PlanLayout {
  return {
    ungrouped: sections[0].items.map((i) => i.id),
    groups: sections.slice(1).map((s) => ({
      id: s.id as string,
      itemIds: s.items.map((i) => i.id),
    })),
  };
}

export function sameLayout(a: PlanSectionView[], b: PlanSectionView[]) {
  return JSON.stringify(toLayout(a)) === JSON.stringify(toLayout(b));
}

export function findItemSection(sections: PlanSectionView[], itemId: string) {
  return sections.findIndex((s) => s.items.some((i) => i.id === itemId));
}

/** Move an item to `toSection` at `toIndex` (clamped), removing it from its current section. */
export function moveItem(
  sections: PlanSectionView[],
  itemId: string,
  toSection: number,
  toIndex: number
): PlanSectionView[] {
  const from = findItemSection(sections, itemId);
  if (from === -1) return sections;
  const fromIndex = sections[from].items.findIndex((i) => i.id === itemId);

  if (from === toSection) {
    const clamped = Math.max(0, Math.min(toIndex, sections[from].items.length - 1));
    if (clamped === fromIndex) return sections;
    return sections.map((s, i) =>
      i === from ? { ...s, items: arrayMove(s.items, fromIndex, clamped) } : s
    );
  }

  const item = sections[from].items[fromIndex];
  return sections.map((s, i) => {
    if (i === from) return { ...s, items: s.items.filter((it) => it.id !== itemId) };
    if (i === toSection) {
      const items = [...s.items];
      items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, item);
      return { ...s, items };
    }
    return s;
  });
}

/**
 * Move an item one visible step up (-1) or down (+1) within its section,
 * jumping over hidden placeholders so every press visibly moves the card.
 */
export function stepItem(
  sections: PlanSectionView[],
  itemId: string,
  dir: -1 | 1
): PlanSectionView[] {
  const s = findItemSection(sections, itemId);
  if (s === -1) return sections;
  const items = sections[s].items;
  const from = items.findIndex((i) => i.id === itemId);
  let to = from + dir;
  while (to >= 0 && to < items.length && !isVisible(items[to])) to += dir;
  if (to < 0 || to >= items.length) return sections;
  return moveItem(sections, itemId, s, to);
}

/** Can the item move one visible step in `dir`? */
export function canStepItem(section: PlanSectionView, itemId: string, dir: -1 | 1) {
  const visible = section.items.filter(isVisible);
  const idx = visible.findIndex((i) => i.id === itemId);
  return dir === -1 ? idx > 0 : idx !== -1 && idx < visible.length - 1;
}

/** Reorder groups. Indices are into `sections` (0 is Ungrouped and never moves). */
export function moveGroup(
  sections: PlanSectionView[],
  from: number,
  to: number
): PlanSectionView[] {
  if (from < 1 || to < 1 || from >= sections.length || to >= sections.length || from === to) {
    return sections;
  }
  const [ungrouped, ...groups] = sections;
  return [ungrouped, ...arrayMove(groups, from - 1, to - 1)];
}
