"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, RefreshCw, Share2 } from "lucide-react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { mutate: globalMutate } = useSWRConfig();
  const { data: profile, mutate } = useSWR("/api/profile", fetcher);
  const { data: domains } = useSWR<{ id: string; name: string; slug: string }[]>("/api/domains", fetcher);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [switchingDomain, setSwitchingDomain] = useState(false);

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

  async function handleDomainChange(domainId: string) {
    setSwitchingDomain(true);
    const res = await fetch("/api/domains/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });
    if (res.ok) {
      await updateSession({ activeDomainId: domainId });
      mutate((prev: Record<string, unknown>) => ({ ...prev, activeDomainId: domainId }), false);
      globalMutate("/api/topics");
      toast.success("Domain switched");
    } else {
      toast.error("Failed to switch domain");
    }
    setSwitchingDomain(false);
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
          <CardTitle>Interview Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Switch your active domain to see different interview content.
          </p>
          <Select
            value={profile?.activeDomainId ?? ""}
            onValueChange={handleDomainChange}
            disabled={switchingDomain || !domains}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a domain">
                {domains?.find((d) => d.id === profile?.activeDomainId)?.name ?? "Select a domain"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {domains?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
