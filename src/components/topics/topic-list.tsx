"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Edit, Plus, Trash2 } from "lucide-react";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TopicListProps {
  isAdmin?: boolean;
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

      {topics?.map((topic) => (
        <Card key={topic.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
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
                  onClick={() => {
                    setParentTopicId(topic.id);
                    setName("");
                    setEditingSub(null);
                    setSubDialogOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                {(!topic.isDefault || isAdmin) && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingTopic({ id: topic.id, name: topic.name });
                        setName(topic.name);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-7 w-7"
                      onClick={() => handleDeleteTopic(topic.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          {topic.subTopics.length > 0 && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {topic.subTopics.map((sub) => (
                  <Badge
                    key={sub.id}
                    variant="outline"
                    className="gap-1 py-1"
                  >
                    {sub.name}
                    {(!sub.isDefault || isAdmin) && (
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setParentTopicId(topic.id);
                            setEditingSub({ id: sub.id, name: sub.name });
                            setName(sub.name);
                            setSubDialogOpen(true);
                          }}
                          className="hover:text-foreground"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubTopic(sub.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {topics?.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No topics yet. Create your first topic to organize your questions.
        </p>
      )}
    </div>
  );
}
