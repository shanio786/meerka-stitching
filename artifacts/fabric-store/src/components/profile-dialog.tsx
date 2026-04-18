import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPatch } from "@/lib/api";
import { useMe } from "@/hooks/useMe";
import { useToast } from "@/hooks/use-toast";

export function ProfileDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { me, refresh } = useMe();
  const { toast } = useToast();

  const [username, setUsername] = useState(me?.username || "");
  const [fullName, setFullName] = useState(me?.fullName || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiPatch("/me/profile", { username: username.trim(), fullName: fullName.trim() });
      await refresh();
      toast({ title: "Profile updated" });
    } catch (err) {
      toast({ title: "Update failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiPatch("/me/password", { currentPassword, newPassword });
      toast({ title: "Password changed" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Password change failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="profile-dialog">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
          <DialogDescription>Update your profile and password here.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="profile" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
            <TabsTrigger value="password" data-testid="tab-password">Password</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <form onSubmit={onSaveProfile} className="space-y-3">
              <div>
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  data-testid="input-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="user-name">Username</Label>
                <Input
                  id="user-name"
                  data-testid="input-edit-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Role: <span className="font-semibold capitalize">{me?.role || "-"}</span>
              </div>
              <Button type="submit" className="w-full" disabled={savingProfile} data-testid="button-save-profile">
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="password" className="mt-4">
            <form onSubmit={onChangePassword} className="space-y-3">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  data-testid="input-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  data-testid="input-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  data-testid="input-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={savingPassword} data-testid="button-save-password">
                {savingPassword ? "Saving..." : "Change Password"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
