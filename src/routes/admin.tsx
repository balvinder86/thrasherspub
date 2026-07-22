import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useTeamMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  type Role,
  type TeamMember,
} from "@/lib/admin/queries";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRestaurantIds } from "@/lib/supabase/scope";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, UserPlus, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Thrasher's Pub" }] }),
  component: AdminPage,
});

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", manager: "Manager", staff: "Staff" };

function AdminPage() {
  const { memberships } = useAuth();
  const restaurantId = useRestaurantIds()[0];
  const myRole = memberships.find((m) => m.restaurant_id === restaurantId)?.role;
  const canManage = myRole === "owner";

  const { data: members, isLoading, error } = useTeamMembers();
  const inviteMember = useInviteMember();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("staff");
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [emailFallback, setEmailFallback] = useState<{ error: string; link: string } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const ownerCount = (members ?? []).filter((m) => m.role === "owner").length;

  return (
    <div className="min-h-screen bg-background">
      <Topbar eyebrow="Workspace" title="Admin" />
      <main className="px-8 py-8 max-w-4xl mx-auto space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">
              Team & access
            </p>
            <h1 className="font-serif text-4xl text-foreground">Manage users</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              {canManage
                ? "Invite people to Thrasher's Pub and control what they can do."
                : "Only an owner can invite people or change access. You can see who's on the team below."}
            </p>
          </div>
          {canManage && (
            <Button className="gap-2" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite person
            </Button>
          )}
        </header>

        {error && (
          <div className="text-sm text-[#a8453a]">
            Couldn't load the team: {(error as Error).message}
          </div>
        )}

        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canManage && (
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading team…
                  </TableCell>
                </TableRow>
              ) : !members?.length ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No one on the team yet.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-medium">
                      {m.email}
                      {m.isSelf && (
                        <Badge variant="outline" className="ml-2 font-normal text-xs">
                          You
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={m.role}
                          onValueChange={(role) =>
                            updateRole.mutate({ userId: m.userId, role: role as Role })
                          }
                          disabled={updateRole.isPending || (m.role === "owner" && ownerCount <= 1)}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="font-normal">
                          {ROLE_LABEL[m.role]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {timeAgo(m.joinedAt)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={m.role === "owner" && ownerCount <= 1}
                          onClick={() => setMemberToRemove(m)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {(updateRole.isError || removeMember.isError) && (
          <p className="text-sm text-[#a8453a]">
            {((updateRole.error ?? removeMember.error) as Error).message}
          </p>
        )}
      </main>

      {/* Invite dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) {
            setInviteEmail("");
            setInviteRole("staff");
            setEmailFallback(null);
            setLinkCopied(false);
            inviteMember.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" /> Invite to Thrasher's Pub
            </DialogTitle>
            <DialogDescription>
              We'll email them a link to set a password and sign in.
            </DialogDescription>
          </DialogHeader>

          {emailFallback ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                They now have access, but the invite email couldn't be sent ({emailFallback.error}).
                Share this link with them directly:
              </p>
              <div className="flex items-center gap-2">
                <Input readOnly value={emailFallback.link} className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(emailFallback.link).then(() => {
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 1500);
                    });
                  }}
                >
                  {linkCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              <Button className="w-full" onClick={() => setInviteOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">
                        Owner — full access, can manage the team
                      </SelectItem>
                      <SelectItem value="manager">Manager — day-to-day operations</SelectItem>
                      <SelectItem value="staff">Staff — limited access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {inviteMember.isError && (
                  <p className="text-sm text-[#a8453a]">{(inviteMember.error as Error).message}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  className="w-full"
                  disabled={!inviteEmail.includes("@") || inviteMember.isPending}
                  onClick={() =>
                    inviteMember.mutate(
                      { email: inviteEmail, role: inviteRole },
                      {
                        onSuccess: (result) => {
                          if (result.emailSent) {
                            setInviteOpen(false);
                          } else {
                            setEmailFallback({
                              error: result.emailError ?? "unknown error",
                              link: result.inviteLink ?? "",
                            });
                          }
                        },
                      },
                    )
                  }
                >
                  {inviteMember.isPending ? "Sending invite…" : "Send invite"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(o) => !o && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll immediately lose access to Thrasher's Pub. Their account itself isn't deleted
              — they can be re-invited later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (memberToRemove) removeMember.mutate(memberToRemove.userId);
                setMemberToRemove(null);
              }}
              className="bg-[hsl(var(--terracotta))] hover:bg-[hsl(var(--terracotta))]/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
