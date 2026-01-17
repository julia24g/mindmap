import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Card } from "@/components/ui/card";

interface TagNodeData {
  label: string;
}

export default memo(({ data }: { data: TagNodeData }) => {
  const capitalizedLabel =
    data.label.charAt(0).toUpperCase() + data.label.slice(1);

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <Card className="bg-blue-500 text-white border-blue-600 px-3 py-2 text-sm">
        {capitalizedLabel}
      </Card>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
