"use client";

import * as React from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 6, value, onChange, disabled }: OTPInputProps) {
  const inputsRef = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  const handleChange = (idx: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    const next = (value.substring(0, idx) + digits + value.substring(idx + digits.length)).slice(0, length);
    onChange(next);
    if (digits && inputsRef.current[idx + 1]) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft') {
      inputsRef.current[Math.max(0, idx - 1)]?.focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowRight') {
      inputsRef.current[Math.min(length - 1, idx + 1)]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-10 h-10 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ))}
    </div>
  );
}

