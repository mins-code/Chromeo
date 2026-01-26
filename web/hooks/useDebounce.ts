import { useState, useEffect } from 'react';

/**
 * Hook to debounce a value.
 * Returns the value after the specified delay has passed without it changing.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if the value changes (or component unmounts)
    // before the delay has passed
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
