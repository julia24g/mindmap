import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const CONTENT_TYPES = [
  { value: "thought", label: "Thought", emoji: "💭" },
  { value: "media", label: "Media", emoji: "🎥" },
  { value: "event", label: "Event", emoji: "📅" },
  { value: "concept", label: "Concept", emoji: "🧠" },
] as const;

type ContentTypeValue = (typeof CONTENT_TYPES)[number]["value"];

interface ContentTypeBadgeProps {
  value?: string;
  onChange: (value: ContentTypeValue) => void;
  placeholder?: string;
  showLabel?: boolean; // handy: turn off when used in the title meta row
}

export function ContentTypeBadge({
  value,
  onChange,
  placeholder = "Select",
  showLabel = false,
}: ContentTypeBadgeProps) {
  const [open, setOpen] = React.useState(false);
  const selected = CONTENT_TYPES.find((t) => t.value === value);
  const label = selected?.label ?? placeholder;

  return (
    <div className={cn("flex items-center", showLabel ? "gap-2" : "")}>
      {showLabel && <span className="text-sm text-muted-foreground">Type</span>}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {/* Button provides semantics + focus ring; Badge provides the look */}
          <Button
            type="button"
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
            )}
          >
            <Badge
              variant="secondary"
              className={cn(
                "cursor-pointer select-none",
                "px-2 py-1",
                "text-xs font-normal",
                "hover:bg-muted",
                !selected && "text-muted-foreground",
              )}
            >
              {selected?.emoji && (
                <span className="leading-none mr-1">{selected.emoji}</span>
              )}
              {label}
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-60" />
            </Badge>
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-48 p-0" align="start">
          <Command>
            <CommandList>
              <CommandEmpty>No type found.</CommandEmpty>
              <CommandGroup>
                {CONTENT_TYPES.map((type) => (
                  <CommandItem
                    key={type.value}
                    value={type.value}
                    onSelect={() => {
                      onChange(type.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === type.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {type.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
