import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "../ui/card";

interface PublicContentNodeData {
  title: string;
  contentId: string;
  onNodeClick?: (contentId: string) => void;
}

export default memo(({ data }: { data: PublicContentNodeData }) => {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <Card className="px-3 py-2 text-sm">{data.title}</Card>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
