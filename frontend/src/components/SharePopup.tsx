import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SharePopup() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Share</Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="publish">Publish</TabsTrigger>
          </TabsList>
          <TabsContent value="share">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input placeholder="Enter email address" />
                <Button>Invite</Button>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="publish">
            <div className="space-y-2">
              <h3 className="font-medium text-sm">Publish</h3>
              <p className="text-sm text-muted-foreground">
                Publish your content publicly.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
