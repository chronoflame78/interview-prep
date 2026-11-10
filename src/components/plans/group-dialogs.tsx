"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface GroupNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<boolean>;
}

export function GroupNameDialog(props: GroupNameDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        {props.open && <GroupNameFields {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function GroupNameFields({
  onOpenChange,
  submitLabel,
  initialName = "",
  onSubmit,
}: GroupNameDialogProps) {
  const [name, setName] = useState(initialName);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    const ok = await onSubmit(name.trim());
    setPending(false);
    if (ok) onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        aria-label="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. JavaScript core"
        maxLength={100}
        autoFocus
      />
      <Button type="submit" className="w-full" disabled={!name.trim() || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}

interface DeleteGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  questionCount: number;
  onConfirm: (mode: "move" | "remove") => Promise<void>;
}

/** Shown only for a group that still holds questions. */
export function DeleteGroupDialog({
  open,
  onOpenChange,
  groupName,
  questionCount,
  onConfirm,
}: DeleteGroupDialogProps) {
  const [pending, setPending] = useState(false);
  const plural = questionCount === 1 ? "question" : "questions";

  async function run(mode: "move" | "remove") {
    setPending(true);
    await onConfirm(mode);
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{groupName}&rdquo;?</DialogTitle>
          <DialogDescription>
            This group has {questionCount} {plural}. What should happen to them?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button disabled={pending} onClick={() => run("move")}>
            Move {questionCount} {plural} to Ungrouped
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => run("remove")}>
            Remove them from the plan
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
