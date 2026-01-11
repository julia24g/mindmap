import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import ContentForm from "./ContentForm"

interface AddContentProps {
  onContentAdded?: () => void;
}

export default function AddContent({ onContentAdded }: AddContentProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Show Dialog</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <ContentForm onContentAdded={onContentAdded} />
      </AlertDialogContent>
    </AlertDialog>
  )
}
