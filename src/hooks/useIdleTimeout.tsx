
import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const useIdleTimeout = (timeout: number, onIdle: () => void) => {
    const [isIdle, setIsIdle] = useState(false);
    const timeoutId = useRef<number | null>(null);

    const resetTimer = useCallback(() => {
        if (timeoutId.current) {
            window.clearTimeout(timeoutId.current);
        }
        setIsIdle(false);
        timeoutId.current = window.setTimeout(() => {
            setIsIdle(true);
            onIdle();
        }, timeout);
    }, [timeout, onIdle]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

        const handleActivity = () => {
            resetTimer();
        };

        // Set up event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        // Initialize the timer
        resetTimer();

        // Cleanup function
        return () => {
            if (timeoutId.current) {
                window.clearTimeout(timeoutId.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [resetTimer]);

    return isIdle;
};

export const useIdleSignOut = (timeoutInMinutes: number) => {
    const handleSignOut = useCallback(async () => {
        try {
            await signOut(auth);
            alert("Has sido desconectado por inactividad.");
            window.location.href = '/login';
        } catch (error) {
            console.error('Error al cerrar sesión por inactividad:', error);
        }
    }, []);

    useIdleTimeout(timeoutInMinutes * 60 * 1000, handleSignOut);
};

export default useIdleTimeout;
