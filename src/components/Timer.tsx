interface TimerProps {
  remainingSeconds: number;
  formatTime: (seconds: number) => string;
}

export function Timer({ remainingSeconds, formatTime }: TimerProps) {
  const isOvertime = remainingSeconds < 0;

  return (
    <span
      className={`font-mono text-lg font-bold ${
        isOvertime ? 'text-red-400' : 'text-green-400'
      }`}
    >
      {formatTime(remainingSeconds)}
    </span>
  );
}
