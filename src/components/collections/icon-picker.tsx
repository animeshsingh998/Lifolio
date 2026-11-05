"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CollectionIcon } from "./collection-icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLLECTION_ICONS, type CollectionIconName } from "@/lib/collections/icons";
import { cn } from "@/lib/utils";

type IconPickerProps = {
  value: CollectionIconName;
  onChange: (icon: CollectionIconName) => void;
  id?: string;
  disabled?: boolean;
};

export function IconPicker({ value, onChange, id, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button id={id} type="button" variant="outline" disabled={disabled} className="w-fit gap-2" />}
      >
        <CollectionIcon name={value} />
        <span className="text-muted-foreground">{value}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div role="listbox" aria-label="Icon" className="grid grid-cols-8 gap-1">
          {COLLECTION_ICONS.map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={name === value}
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                name === value && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <CollectionIcon name={name} />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
