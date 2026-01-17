import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Lock, Clock, Share2 } from "lucide-react"

export default function MenuBar() {
  // Mock data - replace with actual state/props
  const lastEdited = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const isPrivate = true

  return (
    <div className="flex items-center justify-between w-full px-4 py-3">
      {/* Left side - Breadcrumb */}
      <p>Home</p>

      {/* Right side - Status indicators and Share button */}
      <div className="flex items-center gap-4">
        <TooltipProvider>
          {/* Privacy Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-default">
                <Lock className="h-4 w-4" />
                <span>{isPrivate ? "Private" : "Public"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This page is {isPrivate ? "private" : "public"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Last Edited */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm cursor-default">
                <Clock className="h-4 w-4" />
                <span>Edited</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last edited: {lastEdited}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Share Button */}
        <Button variant="default" size="sm">
          Share
        </Button>
      </div>
    </div>
  )
}
