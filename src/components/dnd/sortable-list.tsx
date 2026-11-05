"use client";

import { useId } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type SortableListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[], from: number, to: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  disabled?: boolean;
  className?: string;
};

/** Vertical drag-to-reorder list. Each row gets a grip handle; keyboard reordering works via the handle. */
export function SortableList<T>({ items, getId, onReorder, renderItem, disabled, className }: SortableListProps<T>) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to), from, to);
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={cn("flex flex-col gap-2", className)}>
          {items.map((item, index) => (
            <SortableRow key={ids[index]} id={ids[index]} disabled={disabled}>
              {renderItem(item, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, disabled, children }: { id: string; disabled?: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-card p-2",
        isDragging && "relative z-10 shadow-lg ring-1 ring-ring/40",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label="Drag to reorder"
        disabled={disabled}
        className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing disabled:cursor-default disabled:opacity-40"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </li>
  );
}
