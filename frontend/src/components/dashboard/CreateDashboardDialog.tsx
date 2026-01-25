import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDashboard } from "@/api/createDashboard";
import { useAuthContext } from "@/contexts/AuthContext";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (dashboardId: string) => void;
  showTrigger?: boolean;
};

export function CreateDashboardDialog({
  open,
  onOpenChange,
  onCreated,
  showTrigger = true,
}: Props) {
  const { currentUser } = useAuthContext();
  const { createDashboard } = useCreateDashboard();
  const nameRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value?.trim() || "";
    if (!currentUser?.uid) {
      return;
    }
    if (!name) {
      return;
    }

    try {
      const result = await createDashboard({
        variables: { firebaseUid: currentUser.uid, name },
      });
      const newId = result.data?.createDashboard?.id;
      if (newId && onCreated) onCreated(String(newId));
    } catch (err) {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">Create Dashboard</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-106.25">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Dashboard</DialogTitle>
            <DialogDescription>
              Create a new dashboard by giving it a name.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input
                id="name-1"
                name="name"
                defaultValue="My New Dashboard"
                ref={nameRef}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
