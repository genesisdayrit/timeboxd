interface TimerProps {
  remainingSeconds: number;
  formatTime: (seconds: number) => string;
}

export function Timer({ remainingSeconds, formatTime }: TimerProps) {
  const isOvertime = remainingSeconds < 0;

  return (
    <span
      className={`font-mono text-lg font-bold ${
        isOvertime ? 'text-red-400/70' : 'text-emerald-400/70'
      }`}
    >
      {formatTime(remainingSeconds)}
    </span>
  );
}
