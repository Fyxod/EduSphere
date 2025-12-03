import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDuration(totalSeconds: number): string {
    if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
        return '0m';
    }

    const seconds = Math.max(0, Math.round(totalSeconds));
    if (seconds < 60) {
        return '<1m';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        if (minutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
}
