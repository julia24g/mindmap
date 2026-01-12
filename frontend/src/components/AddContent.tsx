import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import ContentForm from "./ContentForm"

interface AddContentProps {
  onContentAdded?: () => void;
}

export default function AddContent({ onContentAdded }: AddContentProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Add Content</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New Content</SheetTitle>
        </SheetHeader>
        <ContentForm onContentAdded={onContentAdded} />
      </SheetContent>
    </Sheet>
  )
}
