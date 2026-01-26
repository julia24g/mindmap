import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateDashboard } from "@/api/createDashboard";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (dashboardId: string) => void;
  showTrigger?: boolean;
  refetchDashboards?: () => void;
};

export function CreateDashboardDialog({
  open,
  onOpenChange,
  onCreated,
  showTrigger = true,
  refetchDashboards,
}: Props) {
  const navigate = useNavigate();
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
      if (refetchDashboards) await refetchDashboards();
      if (newId) {
        navigate(`/dashboard/${newId}`);
        if (onCreated) onCreated(String(newId));
      }
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create a new dashboard</DialogTitle>
              <DialogDescription>
                Create a new dashboard by giving it a name.
              </DialogDescription>
            </DialogHeader>
            <Input
              id="name-1"
              name="name"
              defaultValue="My New Dashboard"
              ref={nameRef}
              autoFocus
            />
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
