"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { SortableImage } from "./SortableImage";
import type { GalleryImage } from "@/types";
import Image from "next/image";
import { getThumbnailUrl } from "@/lib/image-loader";

interface ReorderGridProps {
  images: GalleryImage[];
  onOrderChange: (newOrder: GalleryImage[]) => void;
}

export function ReorderGrid({ images, onOrderChange }: ReorderGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (active.id !== over?.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over?.id);
      
      const newOrder = arrayMove(images, oldIndex, newIndex);
      onOrderChange(newOrder);
    }
  };

  const activeImage = activeId ? images.find(img => img.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        <SortableContext items={images.map(i => i.id)} strategy={rectSortingStrategy}>
          {images.map((image) => (
            <SortableImage key={image.id} image={image} />
          ))}
        </SortableContext>
      </div>

      <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.4',
              },
            },
          }),
        }}>
        {activeId && activeImage ? (
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-bf-rosegold-flat shadow-2xl scale-105 z-50">
            <Image
              src={getThumbnailUrl(activeImage.thumbnail_path || activeImage.storage_path, 400, 80)}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
