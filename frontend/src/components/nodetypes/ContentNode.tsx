import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from "@/components/ui/button";

interface ContentNodeData {
  title: string;
  contentId: string;
  onNodeClick?: (contentId: string) => void;
}

export default memo(({ data }: { data: ContentNodeData }) => {
  const handleClick = () => {
    if (data.onNodeClick && data.contentId) {
      data.onNodeClick(data.contentId);
    }
  };

  return (
    <div>
      <Handle type="target" position={Position.Top} isConnectable={true} />
      <Button variant="outline" onClick={handleClick}>
        {data.title}
      </Button>
      <Handle type="source" position={Position.Bottom} isConnectable={true} />
    </div>
  );
});
