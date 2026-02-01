import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import ContentDialogContext from "@/contexts/ContentDialogContext";

interface PrivateContentNodeData {
  title: string;
  contentId: string;
  onNodeClick?: (contentId: string) => void;
}

export default memo(({ data }: { data: PrivateContentNodeData }) => {
  const ctx = useContext(ContentDialogContext);
  const handleClick = () => {
    if (data.contentId) {
      if (ctx && ctx.openViewDialog) {
        ctx.openViewDialog(data.contentId);
      } else if (data.onNodeClick) {
        data.onNodeClick(data.contentId);
      }
    }
  };

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <Button variant="outline" onClick={handleClick}>
        {data.title}
      </Button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
