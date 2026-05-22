"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { data: profile, mutate } = useSWR("/api/profile", fetcher);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const shareUrl =
    profile?.shareSlug && typeof window !== "undefined"
      ? `${window.location.origin}/share/${profile.shareSlug}`
      : null;

  async function handleUpdateName() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      toast.success("Profile updated");
      mutate();
      updateSession({ name });
    } else {
      toast.error("Failed to update");
    }
    setSaving(false);
  }

  async function handleGenerateShareLink() {
    const res = await fetch("/api/profile/share", { method: "POST" });
    if (res.ok) {
      toast.success("Share link generated");
      mutate();
    } else {
      toast.error("Failed to generate link");
    }
  }

  function copyShareLink() {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile and share settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={session?.user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <div className="flex gap-2">
              <Input
                value={name || profile?.name || ""}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Button onClick={handleUpdateName} disabled={saving}>
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Share your customized question set with others. They&apos;ll need to
            be logged in to view it.
          </p>

          {shareUrl ? (
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyShareLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleGenerateShareLink}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleGenerateShareLink}>
              <Share2 className="mr-2 h-4 w-4" />
              Generate Share Link
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
