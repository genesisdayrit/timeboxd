import { useState } from 'react';
import { commands } from '../lib/commands';
import { MarkdownEditor } from './MarkdownEditor';

interface TimeboxFormProps {
  onCreated: () => void;
}

const PRESET_DURATIONS = [5, 15, 45];

export function TimeboxForm({ onCreated }: TimeboxFormProps) {
  const [intention, setIntention] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customDuration, setCustomDuration] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetClick = (duration: number) => {
    setSelectedDuration(duration);
    setIsCustom(false);
    setCustomDuration('');
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    setSelectedDuration(null);
  };

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomDuration(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedDuration(parsed);
    } else {
      setSelectedDuration(null);
    }
  };

  const incrementCustomDuration = (delta: number) => {
    const current = parseInt(customDuration, 10) || 0;
    const newValue = Math.max(5, current + delta);
    setCustomDuration(String(newValue));
    setSelectedDuration(newValue);
  };

  const handleSubmit = async () => {
    if (!intention.trim() || selectedDuration === null) return;

    setIsSubmitting(true);
    try {
      await commands.createTimebox({
        intention: intention.trim(),
        intended_duration: selectedDuration,
        notes: notes.trim() || undefined,
      });
      setIntention('');
      setNotes('');
      setSelectedDuration(null);
      setCustomDuration('');
      setIsCustom(false);
      onCreated();
    } catch (error) {
      console.error('Failed to create timebox:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = intention.trim() && selectedDuration !== null && !isSubmitting;

  return (
    <div className="bg-[#0a0a0a] rounded-lg shadow p-4 mb-6">
      <input
        type="text"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        placeholder="What are you working on?"
        className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]"
        disabled={isSubmitting}
      />

      <div className="flex flex-wrap gap-2 items-center mb-4">
        {PRESET_DURATIONS.map((duration) => (
          <button
            key={duration}
            onClick={() => handlePresetClick(duration)}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedDuration === duration && !isCustom
                ? 'bg-[#5E6AD2] text-white'
                : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {duration} min
          </button>
        ))}

        <div className="flex gap-1 items-center">
          <button
            onClick={() => incrementCustomDuration(-5)}
            disabled={isSubmitting || !isCustom}
            className="px-2 py-2 bg-neutral-900 text-neutral-300 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>
          <input
            type="number"
            value={customDuration}
            onChange={handleCustomDurationChange}
            onFocus={handleCustomClick}
            placeholder="Custom"
            min="1"
            step="5"
            className={`w-20 px-2 py-2 bg-neutral-900 border text-white placeholder-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E6AD2] ${
              isCustom ? 'border-[#5E6AD2]' : 'border-neutral-800'
            }`}
            disabled={isSubmitting}
          />
          <button
            onClick={() => incrementCustomDuration(5)}
            disabled={isSubmitting || !isCustom}
            className="px-2 py-2 bg-neutral-900 text-neutral-300 rounded-lg hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
          <span className="text-neutral-400 text-sm ml-1">min</span>
        </div>
      </div>

      <div className="mb-4">
        <MarkdownEditor
          value={notes}
          onChange={setNotes}
          placeholder="Notes (optional)"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-neutral-900 border border-neutral-800 text-white rounded-lg focus-within:ring-2 focus-within:ring-[#5E6AD2] focus-within:border-[#5E6AD2]"
          minHeight="100px"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full px-4 py-2 bg-[#5E6AD2] text-white rounded-lg hover:bg-[#4f5ab8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        Add Timebox
      </button>
    </div>
  );
}
