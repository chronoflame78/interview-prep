"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  initialDescription?: string | null;
  /** Resolve true to close the dialog; false keeps it open with input intact. */
  onSubmit: (values: { name: string; description: string | null }) => Promise<boolean>;
}

export function PlanFormDialog(props: PlanFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
        </DialogHeader>
        {/* Remount per open so the fields start from the current values. */}
        {props.open && <PlanFormFields {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function PlanFormFields({
  onOpenChange,
  submitLabel,
  initialName = "",
  initialDescription = "",
  onSubmit,
}: PlanFormDialogProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    const ok = await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    });
    setPending(false);
    if (ok) onOpenChange(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan-name">Name</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Frontend onsite"
          maxLength={100}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plan-description">Description (optional)</Label>
        <Textarea
          id="plan-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this plan for?"
          maxLength={500}
          rows={3}
        />
      </div>
      <Button type="submit" className="w-full" disabled={!name.trim() || pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
