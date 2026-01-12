import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ContentNodeData {
  label: string;
  [key: string]: any;
}

const ContentNode = ({ data, id }: NodeProps<ContentNodeData>) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
      >
        {data.label}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{data.label}</SheetTitle>
            <SheetDescription>
              Content Node Details
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <Card>
              <CardContent>
                <div>Node ID</div>
                <div>{id}</div>
              </CardContent>
            </Card>
            {Object.entries(data).map(([key, value]) => {
              if (key === 'label') return null;
              return (
                <Card key={key}>
                  <CardContent>
                    <div>{key}</div>
                    <div>
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default memo(ContentNode);
