// src/config/detectUserInactivity.tsx
// Reusable function to detect user inactivity and trigger a callback after a timeout

import React, { useEffect, useRef, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Progress } from '@components/ui/progress';
import { Button } from '@components/ui/button';

export type InactivityPromptRenderProps = {
    isPromptVisible: boolean;
    countdown: number;
    stayLoggedIn: () => void;
};

export type InactivityConfig = {
    idleTime: number; // ms
    children: (props: InactivityPromptRenderProps) => React.ReactNode;
    countdownSeconds?: number; // seconds for countdown prompt
    resetOnEvents?: string[];
    onLogout: () => void;
};

export const DetectUserInactivity: React.FC<InactivityConfig> = ({
    idleTime,
    countdownSeconds = 60,
    resetOnEvents = ['mousemove', 'keydown', 'click'],
    onLogout,
    children,
}) => {
    const [isPromptVisible, setIsPromptVisible] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number>(countdownSeconds);
    const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
    const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetIdleTimer = () => {
        if (isCountingDown) return;
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setIsPromptVisible(false);
        setCountdown(countdownSeconds);
        idleTimeoutRef.current = setTimeout(() => {
            setIsPromptVisible(true);
            setCountdown(countdownSeconds);
            setIsCountingDown(true);
        }, idleTime);
    };

    useEffect(() => {
        if (!isCountingDown) {
            const eventHandler = () => resetIdleTimer();
            resetOnEvents.forEach(event => {
                window.addEventListener(event, eventHandler);
            });
            resetIdleTimer();
            return () => {
                if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
                if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                resetOnEvents.forEach(event => {
                    window.removeEventListener(event, eventHandler);
                });
            };
        } else {
            // Start countdown interval
            if (!countdownIntervalRef.current) {
                countdownIntervalRef.current = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev <= 1) {
                            clearInterval(countdownIntervalRef.current!);
                            countdownIntervalRef.current = null;
                            setIsPromptVisible(false);
                            setIsCountingDown(false);
                            onLogout();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
            return () => {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
            };
        }
         
    }, [isCountingDown]);

    const stayLoggedIn = () => {
        setIsPromptVisible(false);
        setCountdown(countdownSeconds);
        setIsCountingDown(false);
        resetIdleTimer();
    };

    return (
        <>
            {isPromptVisible && (
                <AlertDialog open={isPromptVisible}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Inactivity Detected</AlertDialogTitle>
                            <AlertDialogDescription>
                                <div className="relative w-full">
                                    <Progress value={(countdown / countdownSeconds) * 100} />
                                    <span className="absolute inset-0 flex items-center justify-center text-white-light text-xs font-semibold">
                                        {countdown} seconds
                                    </span>
                                </div>
                                <p className='my-3 text-red-600 font-semibold'>You have been inactive for a while. Respond or you&apos;ll be logged out within {countdownSeconds} seconds.</p>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button
                                    onClick={stayLoggedIn}
                                    variant="ghost"
                                >
                                    Stay Logged In
                                </Button>
                            </AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {/* eslint-disable-next-line react-hooks/refs */}
            {children ? children({ isPromptVisible, countdown, stayLoggedIn }) : null}
        </>
    );
};
