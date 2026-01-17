import { useGetContent } from "@/api/getContent";
import { useAuthContext } from "@/contexts/AuthContext";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SplitViewProps {
  contentId: string | null;
  onClose: () => void;
}

export default function SplitView({ contentId, onClose }: SplitViewProps) {
  const { currentUser } = useAuthContext();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  const { content, loading, error } = useGetContent(
    contentId || "",
    currentUser?.uid || ""
  );

  useEffect(() => {
    if (contentId) {
      setShouldRender(true);
      // Small delay to trigger animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [contentId]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  if (!shouldRender) return null;

  return (
    <div 
      className={`w-180 border shadow-lg bg-background h-full flex flex-col transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {loading ? "Loading..." : content?.title || "Content Details"}
          </h2>
          {content?.type && (
            <p className="text-sm text-muted-foreground mt-1">
              Type: {content.type}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="space-y-6">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Loading content details...
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive">
              Error loading content: {error.message}
            </div>
          )}

          {content && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2">Content ID</h3>
                <p className="text-sm text-muted-foreground">{content.contentId}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Created At</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(content.created_at).toLocaleString()}
                </p>
              </div>

              {content.properties && Object.keys(content.properties).length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Properties</h3>
                  <div className="space-y-2">
                    {Object.entries(content.properties).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium">{key}: </span>
                        <span className="text-muted-foreground">
                          {typeof value === 'object' 
                            ? JSON.stringify(value, null, 2)
                            : String(value)
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
