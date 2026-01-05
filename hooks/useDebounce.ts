'use client'

import {useCallback, useEffect, useRef} from 'react'

/**
 * Create a debounced function that delays invoking `callback` until after the given `delay`.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds before invoking `callback`
 * @returns A function that schedules `callback` to run after `delay` milliseconds; calling it again before the delay cancels the previously scheduled invocation
 */
export function useDebounce(callback:()=>void, delay:number) {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback])

    return useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => callbackRef.current(), delay)
    }, [delay])
}