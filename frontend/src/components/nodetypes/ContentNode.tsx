import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Button } from "@/components/ui/button";

export default memo(({ data }: { data: { label: string } }) => {
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={true} />
      <Button variant="outline">
        {data.label}
      </Button>
      <Handle type="source" position={Position.Bottom} isConnectable={true} />
    </>
  );
});
