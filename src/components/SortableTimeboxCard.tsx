import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TimeboxWithSessions } from '../lib/types';
import { TimeboxCard } from './TimeboxCard';

interface SortableTimeboxCardProps {
  timebox: TimeboxWithSessions;
  onUpdate: () => void;
  isDragging: boolean;
}

export function SortableTimeboxCard({ timebox, onUpdate, isDragging }: SortableTimeboxCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisDragging,
  } = useSortable({ id: timebox.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isThisDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TimeboxCard timebox={timebox} onUpdate={onUpdate} showDragHandle />
    </div>
  );
}
