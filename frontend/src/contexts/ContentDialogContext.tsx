import React, { createContext, useContext, useState } from "react";
// Dialog is now rendered by the Dashboard directly (so it can receive a containerRef).

type Mode = "view" | "create";

interface ContentDialogContextValue {
  openCreateDialog: () => void;
  openViewDialog: (contentId: string) => void;
  closeDialog: () => void;
  // expose state so a consumer (Dashboard) can render the Dialog component directly
  open: boolean;
  mode: Mode;
  contentId: string | null;
  setOpen: (v: boolean) => void;
}

const ContentDialogContext = createContext<ContentDialogContextValue | null>(
  null,
);

export const ContentDialogProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("create");
  const [contentId, setContentId] = useState<string | null>(null);

  const openCreateDialog = () => {
    setMode("create");
    setContentId(null);
    setOpen(true);
  };

  const openViewDialog = (id: string) => {
    setMode("view");
    setContentId(id);
    setOpen(true);
  };

  const closeDialog = () => setOpen(false);

  return (
    <ContentDialogContext.Provider
      value={{
        openCreateDialog,
        openViewDialog,
        closeDialog,
        open,
        mode,
        contentId,
        setOpen,
      }}
    >
      {children}
    </ContentDialogContext.Provider>
  );
};

export const useContentDialog = () => {
  const ctx = useContext(ContentDialogContext);
  if (!ctx)
    throw new Error(
      "useContentDialog must be used within ContentDialogProvider",
    );
  return ctx;
};

export default ContentDialogContext;
