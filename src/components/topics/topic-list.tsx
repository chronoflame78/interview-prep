"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Edit, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { TopicWithSubTopics } from "@/types";
import {
  applyOrder,
  saveOrder,
  useTopicOrder,
  TOPIC_ORDER_KEY,
  type TopicOrderState,
} from "@/lib/topic-order";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TopicListProps {
  isAdmin?: boolean;
}

type SubTopic = TopicWithSubTopics["subTopics"][number];

interface SubTopicHandlers {
  isAdmin?: boolean;
  onEdit: (topicId: string, sub: SubTopic) => void;
  onDelete: (id: string) => void;
}

interface TopicHandlers extends SubTopicHandlers {
  onAddSub: (topicId: string) => void;
  onEditTopic: (topic: { id: string; name: string }) => void;
  onDeleteTopic: (id: string) => void;
  onReorderSubs: (topicId: string, sub: SubTopic[]) => void;
}

function SortableSubBadge({
  sub,
  topicId,
  handlers,
}: {
  sub: SubTopic;
  topicId: string;
  handlers: SubTopicHandlers;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sub.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <Badge
      ref={setNodeRef}
      style={style}
      variant="outline"
      className="gap-1 py-1"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label={`Reorder ${sub.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      {sub.name}
      {(!sub.isDefault || handlers.isAdmin) && (
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => handlers.onEdit(topicId, sub)}
            className="hover:text-foreground"
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => handlers.onDelete(sub.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </Badge>
  );
}

function SortableTopicCard({
  topic,
  subTopics,
  handlers,
}: {
  topic: TopicWithSubTopics;
  subTopics: SubTopic[];
  handlers: TopicHandlers;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: topic.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleSubDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subTopics.findIndex((s) => s.id === active.id);
    const newIndex = subTopics.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    handlers.onReorderSubs(topic.id, arrayMove(subTopics, oldIndex, newIndex));
  }

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
              aria-label={`Reorder ${topic.name}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            {topic.name}
            {topic.isDefault && (
              <Badge variant="secondary" className="text-xs">
                Default
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handlers.onAddSub(topic.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            {(!topic.isDefault || handlers.isAdmin) && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    handlers.onEditTopic({ id: topic.id, name: topic.name })
                  }
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive h-7 w-7"
                  onClick={() => handlers.onDeleteTopic(topic.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      {subTopics.length > 0 && (
        <CardContent className="pt-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSubDragEnd}
          >
            <SortableContext
              items={subTopics.map((s) => s.id)}
              strategy={rectSortingStrategy}
            >
              <div className="flex flex-wrap gap-2">
                {subTopics.map((sub) => (
                  <SortableSubBadge
                    key={sub.id}
                    sub={sub}
                    topicId={topic.id}
                    handlers={handlers}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      )}
    </Card>
  );
}

export function TopicList({ isAdmin }: TopicListProps) {
  const { data: topics, mutate } = useSWR<TopicWithSubTopics[]>(
    "/api/topics",
    fetcher
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<{ id: string; name: string } | null>(null);
  const [parentTopicId, setParentTopicId] = useState<string | null>(null);
  const [editingSub, setEditingSub] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Per-viewer custom ordering, persisted to localStorage (not the DB) under a
  // single shared key, so the same arrangement drives both this page and the
  // left-nav sidebar. The hook keeps every consumer in sync across reorders.
  const order = useTopicOrder(TOPIC_ORDER_KEY);

  function persistOrder(next: TopicOrderState) {
    saveOrder(TOPIC_ORDER_KEY, next);
  }

  const orderedTopics = useMemo(
    () => (topics ? applyOrder(topics, order.topics) : topics),
    [topics, order.topics]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleTopicDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !orderedTopics) return;
    const oldIndex = orderedTopics.findIndex((t) => t.id === active.id);
    const newIndex = orderedTopics.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(orderedTopics, oldIndex, newIndex);
    persistOrder({ ...order, topics: reordered.map((t) => t.id) });
  }

  function handleReorderSubs(topicId: string, sub: SubTopic[]) {
    persistOrder({
      ...order,
      subs: { ...order.subs, [topicId]: sub.map((s) => s.id) },
    });
  }

  async function handleSaveTopic() {
    if (!name.trim()) return;

    const url = editingTopic ? `/api/topics/${editingTopic.id}` : "/api/topics";
    const method = editingTopic ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, isDefault }),
    });

    if (res.ok) {
      toast.success(editingTopic ? "Topic updated" : "Topic created");
      mutate();
      setDialogOpen(false);
      setName("");
      setEditingTopic(null);
      setIsDefault(false);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save topic");
    }
  }

  async function handleSaveSubTopic() {
    if (!name.trim() || !parentTopicId) return;

    const url = editingSub
      ? `/api/subtopics/${editingSub.id}`
      : "/api/subtopics";
    const method = editingSub ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, topicId: parentTopicId, isDefault }),
    });

    if (res.ok) {
      toast.success(editingSub ? "Sub-topic updated" : "Sub-topic created");
      mutate();
      setSubDialogOpen(false);
      setName("");
      setEditingSub(null);
      setIsDefault(false);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save sub-topic");
    }
  }

  async function handleDeleteTopic(id: string) {
    if (!confirm("Delete this topic and all its sub-topics?")) return;
    const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Topic deleted");
      mutate();
    } else {
      toast.error("Failed to delete");
    }
  }

  async function handleDeleteSubTopic(id: string) {
    if (!confirm("Delete this sub-topic?")) return;
    const res = await fetch(`/api/subtopics/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Sub-topic deleted");
      mutate();
    } else {
      toast.error("Failed to delete");
    }
  }

  const topicHandlers: TopicHandlers = {
    isAdmin,
    onAddSub: (topicId) => {
      setParentTopicId(topicId);
      setName("");
      setEditingSub(null);
      setSubDialogOpen(true);
    },
    onEditTopic: (topic) => {
      setEditingTopic(topic);
      setName(topic.name);
      setDialogOpen(true);
    },
    onDeleteTopic: handleDeleteTopic,
    onEdit: (topicId, sub) => {
      setParentTopicId(topicId);
      setEditingSub({ id: sub.id, name: sub.name });
      setName(sub.name);
      setSubDialogOpen(true);
    },
    onDelete: handleDeleteSubTopic,
    onReorderSubs: handleReorderSubs,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Topics</h2>
        <Button size="sm" onClick={() => { setName(""); setEditingTopic(null); setIsDefault(false); setDialogOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Topic
        </Button>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingTopic(null); setName(""); setIsDefault(false); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTopic ? "Edit Topic" : "New Topic"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. JavaScript"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTopic()}
                />
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isDefault"
                    checked={isDefault}
                    onCheckedChange={(v) => setIsDefault(!!v)}
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Default topic (visible to all users)
                  </Label>
                </div>
              )}
              <Button onClick={handleSaveTopic} className="w-full">
                {editingTopic ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={subDialogOpen} onOpenChange={(o) => { setSubDialogOpen(o); if (!o) { setEditingSub(null); setName(""); setIsDefault(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSub ? "Edit Sub-Topic" : "New Sub-Topic"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Closures"
                onKeyDown={(e) => e.key === "Enter" && handleSaveSubTopic()}
              />
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefaultSub"
                  checked={isDefault}
                  onCheckedChange={(v) => setIsDefault(!!v)}
                />
                <Label htmlFor="isDefaultSub" className="text-sm">
                  Default sub-topic
                </Label>
              </div>
            )}
            <Button onClick={handleSaveSubTopic} className="w-full">
              {editingSub ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {orderedTopics && orderedTopics.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTopicDragEnd}
        >
          <SortableContext
            items={orderedTopics.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {orderedTopics.map((topic) => (
                <SortableTopicCard
                  key={topic.id}
                  topic={topic}
                  subTopics={applyOrder(
                    topic.subTopics,
                    order.subs[topic.id] ?? []
                  )}
                  handlers={topicHandlers}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {topics?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No topics yet. Create your first topic to organize your questions.
        </p>
      )}
    </div>
  );
}
