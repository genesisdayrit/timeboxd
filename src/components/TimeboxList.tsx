import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { TimeboxWithSessions } from '../lib/types';
import { commands } from '../lib/commands';
import { TimeboxCard } from './TimeboxCard';
import { SortableTimeboxCard } from './SortableTimeboxCard';

interface TimeboxListProps {
  timeboxes: TimeboxWithSessions[];
  archivedTimeboxes: TimeboxWithSessions[];
  onUpdate: () => void;
  showCompleted: boolean;
}

export function TimeboxList({ timeboxes, archivedTimeboxes, onUpdate, showCompleted }: TimeboxListProps) {
  const [isDragging, setIsDragging] = useState(false);

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

  // Filter out in_progress timeboxes (they're shown in ActiveTimeboxes)
  const nonActiveTimeboxes = timeboxes.filter((t) => t.status !== 'in_progress');

  // Separate completed and stopped timeboxes
  const completedTimeboxes = nonActiveTimeboxes.filter((t) => t.status === 'completed');
  const stoppedTimeboxes = nonActiveTimeboxes.filter((t) => t.status === 'stopped');
  const pendingTimeboxes = nonActiveTimeboxes.filter(
    (t) => t.status !== 'completed' && t.status !== 'stopped'
  );

  const notStarted = pendingTimeboxes.filter((t) => t.status === 'not_started');
  const paused = pendingTimeboxes.filter((t) => t.status === 'paused');
  const cancelled = pendingTimeboxes.filter((t) => t.status === 'cancelled');

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = notStarted.findIndex((t) => t.id === active.id);
      const newIndex = notStarted.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(notStarted, oldIndex, newIndex);

        // Update display_order for all items in the new order
        const orders = reordered.map((t, index) => ({
          id: t.id,
          display_order: index,
        }));

        try {
          await commands.reorderTimeboxes(orders);
          onUpdate();
        } catch (error) {
          console.error('Failed to reorder timeboxes:', error);
        }
      }
    }
  };

  if (pendingTimeboxes.length === 0 && !showCompleted && archivedTimeboxes.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        No timeboxes for today yet. Create one above!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notStarted.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Not Started</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={notStarted.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {notStarted.map((timebox) => (
                  <SortableTimeboxCard
                    key={timebox.id}
                    timebox={timebox}
                    onUpdate={onUpdate}
                    isDragging={isDragging}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {paused.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Paused</h2>
          <div className="space-y-2">
            {paused.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Cancelled</h2>
          <div className="space-y-2">
            {cancelled.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {showCompleted && stoppedTimeboxes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Stopped</h2>
          <div className="space-y-2">
            {stoppedTimeboxes.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {showCompleted && completedTimeboxes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Completed</h2>
          <div className="space-y-2">
            {completedTimeboxes.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {showCompleted && archivedTimeboxes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-300 mb-3">Archived</h2>
          <div className="space-y-2">
            {archivedTimeboxes.map((timebox) => (
              <TimeboxCard key={timebox.id} timebox={timebox} onUpdate={onUpdate} isArchived />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
