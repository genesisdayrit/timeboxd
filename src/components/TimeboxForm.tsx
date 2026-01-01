import { useState } from 'react';
import { commands } from '../lib/commands';

interface TimeboxFormProps {
  onCreated: () => void;
}

const PRESET_DURATIONS = [5, 15, 45];

export function TimeboxForm({ onCreated }: TimeboxFormProps) {
  const [description, setDescription] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (duration: number) => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      await commands.createTimebox({
        description: description.trim(),
        intended_duration: duration,
      });
      setDescription('');
      setCustomDuration('');
      onCreated();
    } catch (error) {
      console.error('Failed to create timebox:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = parseFloat(customDuration);
    if (!isNaN(duration) && duration > 0) {
      handleCreate(duration);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-4 mb-6">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What are you working on?"
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isSubmitting}
      />

      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_DURATIONS.map((duration) => (
          <button
            key={duration}
            onClick={() => handleCreate(duration)}
            disabled={!description.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {duration} min
          </button>
        ))}

        <form onSubmit={handleCustomSubmit} className="flex gap-2 items-center">
          <input
            type="number"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
            placeholder="Custom"
            min="0.5"
            step="0.5"
            className="w-20 px-2 py-2 bg-gray-700 border border-gray-600 text-gray-100 placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!description.trim() || !customDuration || isSubmitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start
          </button>
        </form>
      </div>
    </div>
  );
}
