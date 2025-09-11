import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endTime: string;
  onExpired?: () => void;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export default function CountdownTimer({ 
  endTime, 
  onExpired, 
  size = 'medium', 
  showLabels = true,
  className = '' 
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const targetTime = new Date(endTime).getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        });
        onExpired?.();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      });
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Set up interval to update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpired]);

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          container: 'text-sm',
          number: 'text-lg font-bold',
          label: 'text-xs'
        };
      case 'large':
        return {
          container: 'text-lg',
          number: 'text-3xl font-bold',
          label: 'text-sm'
        };
      default:
        return {
          container: 'text-base',
          number: 'text-xl font-bold',
          label: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (timeRemaining.isExpired) {
    return (
      <div className={`text-red-600 font-semibold ${sizeClasses.container} ${className}`}>
        Sale Ended
      </div>
    );
  }

  const timeUnits = [
    { value: timeRemaining.days, label: 'Days', shortLabel: 'd' },
    { value: timeRemaining.hours, label: 'Hours', shortLabel: 'h' },
    { value: timeRemaining.minutes, label: 'Minutes', shortLabel: 'm' },
    { value: timeRemaining.seconds, label: 'Seconds', shortLabel: 's' }
  ];

  // Filter out zero days if less than 1 day remaining
  const displayUnits = timeRemaining.days > 0 
    ? timeUnits 
    : timeUnits.slice(1);

  return (
    <div className={`flex items-center space-x-1 ${sizeClasses.container} ${className}`}>
      {displayUnits.map((unit, index) => (
        <div key={unit.label} className="flex items-center">
          {index > 0 && <span className="mx-1 text-gray-400">:</span>}
          <div className="flex flex-col items-center">
            <span className={`${sizeClasses.number} text-red-600 leading-none`}>
              {unit.value.toString().padStart(2, '0')}
            </span>
            {showLabels && (
              <span className={`${sizeClasses.label} text-gray-500 leading-none`}>
                {size === 'small' ? unit.shortLabel : unit.label}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
