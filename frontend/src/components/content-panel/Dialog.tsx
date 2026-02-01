import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { useCreateBlockNote } from "@blocknote/react";
import { useGetContent } from "@/api/getContent";
import { useEffect } from "react";
import { BlockNoteView } from "@blocknote/shadcn";
import { loadEditorFromNotes } from "@/util/loadEditorFromNotes";
import blockNoteTransform from "@/util/blockNoteTransform";
import { useAddContent } from "@/api/addContent";
import { useParams } from "react-router";
import { DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
import { formatFullDate } from "../../util/dateFormat";

type Mode = "view" | "create";

interface ContentSidePanelProps {
  mode: Mode;
  contentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalContainer?: Element | null;
}

export const DialogDemo = ({
  mode,
  contentId,
  open,
  onOpenChange,
  portalContainer,
}: ContentSidePanelProps) => {
  const { dashboardId } = useParams<{ dashboardId: string }>();

  const editor = useCreateBlockNote();
  const selectedContentId = mode === "create" ? "" : (contentId ?? "");

  const { content } = useGetContent(selectedContentId);
  const dashboardIdSafe = dashboardId ?? "";
  const { addContent, loading: addLoading } = useAddContent(dashboardIdSafe);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string | undefined>(undefined);

  const createdAtISO = content?.created_at ?? new Date().toISOString();

  useEffect(() => {
    if (mode === "view") {
      setTitle(content?.title || "");
      setType(content?.type || undefined);

      loadEditorFromNotes(editor, content?.notesJSON);
    }
  }, [mode, content?.title, content?.type, content?.notesJSON, editor]);

  const onSubmit = async () => {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) return;

    const transformedNotes = blockNoteTransform(editor.document);

    await addContent({
      variables: {
        dashboardId: dashboardIdSafe,
        title: trimmedTitle,
        type,
        notesText: transformedNotes,
        notesJSON: JSON.stringify(editor.document),
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setTitle("");
        setType(undefined);
        loadEditorFromNotes(editor, null);
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-sm" portalContainer={portalContainer}>
        <DialogHeader>
          <DialogTitle>
            <input
              id="name-1"
              name="name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New content"
              className="text-3xl font-semibold outline-none placeholder:text-muted-foreground/30"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Created {formatFullDate(createdAtISO)}</span>
              <span className="opacity-50">•</span>
              <ContentTypeBadge
                value={type}
                onChange={(newType) => setType(newType)}
              />
            </div>
          </DialogTitle>
          <DialogDescription>
            {/* Editor */}
            <div className="flex-1 overflow-auto px-12 py-8">
              <BlockNoteView editor={editor} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="submit" onClick={onSubmit}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
