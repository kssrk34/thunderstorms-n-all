"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ImageIcon, Pencil } from "lucide-react";
import { AlertsSettings } from "@/components/alerts";
import { AvatarPicker, ProfileForm } from "@/components/forms";
import { Section } from "@/components/game";
import { AchievementGrid, AuraHistory, FramePicker, Preferences, ProfileHero, ProfileStats } from "@/components/profile";
import { Account, Appearance, Cousins, HowItWorks, InstallApp, YourData } from "@/components/settings";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGame } from "@/lib/store";

type Tab = "overview" | "achievements" | "history" | "alerts" | "settings";
const TABS: Tab[] = ["overview", "achievements", "history", "alerts", "settings"];

function ProfileInner() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "overview";
  const { me, profile } = useGame();
  const [editing, setEditing] = useState<"identity" | "avatar" | null>(null);
  const setTab = (v: string) => router.replace(v === "overview" ? "/profile" : `/profile?tab=${v}`, { scroll: false });

  return (
    <div className="space-y-8">
      <ProfileHero m={profile} actions={
        <>
          <Button size="sm" variant="secondary" onClick={() => setEditing("avatar")}><ImageIcon />Avatar</Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing("identity")}><Pencil />Edit</Button>
        </>
      } />
      {!profile.character && !profile.photo && (
        <button onClick={() => setEditing("avatar")} className="electric panel flex w-full items-center gap-3 p-4 text-left">
          <ImageIcon className="h-5 w-5 text-primary" />
          <span className="flex-1"><span className="block text-[15px] font-semibold">Choose your character</span><span className="block text-[13px] text-muted-foreground">Pick one of the five characters or upload a photo. Your cousins will see it everywhere.</span></span>
        </button>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="no-scrollbar flex w-full overflow-x-auto sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Badges</TabsTrigger>
          <TabsTrigger value="history">Aura</TabsTrigger>
          <TabsTrigger value="alerts">Notifications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-10">
          <ProfileStats id={me} />
          <FramePicker />
          <Preferences />
        </TabsContent>
        <TabsContent value="achievements"><AchievementGrid id={me} /></TabsContent>
        <TabsContent value="history"><Section title="Aura history" eyebrow="Every point, accounted for"><AuraHistory /></Section></TabsContent>
        <TabsContent value="alerts"><AlertsSettings /></TabsContent>
        <TabsContent value="settings" className="space-y-10">
          <Appearance />
          <InstallApp />
          <Cousins />
          <Account />
          <YourData />
          <HowItWorks />
        </TabsContent>
      </Tabs>

      <Dialog open={editing === "identity"} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Only you can change your profile.</DialogDescription></DialogHeader>
          {editing === "identity" && <ProfileForm onSaved={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={editing === "avatar"} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader><DialogTitle>Your avatar</DialogTitle><DialogDescription>Each character belongs to one cousin. Changes save straight away.</DialogDescription></DialogHeader>
          {editing === "avatar" && <AvatarPicker />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Profile() {
  return <Suspense><ProfileInner /></Suspense>;
}
