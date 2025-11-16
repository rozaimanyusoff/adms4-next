'use client'

import React, { useEffect, useRef } from 'react'

interface DateInputProps {
  value?: Date
  onChange: (date: Date) => void
}

interface DateParts {
  day: number
  month: number
  year: number
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange }) => {
  const [date, setDate] = React.useState<DateParts>(() => {
    const d = value ? new Date(value) : new Date()
    return {
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    }
  })

  const dayRef = useRef<HTMLInputElement | null>(null)
  const monthRef = useRef<HTMLInputElement | null>(null)
  const yearRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const d = value ? new Date(value) : new Date()
    setDate({
      day: d.getDate(),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    })
  }, [value])

  const validateDate = (field: keyof DateParts, valueNum: number): boolean => {
    if (
      (field === 'day' && (valueNum < 1 || valueNum > 31)) ||
      (field === 'month' && (valueNum < 1 || valueNum > 12)) ||
      (field === 'year' && (valueNum < 1000 || valueNum > 9999))
    ) {
      return false
    }

    const newDate = { ...date, [field]: valueNum }
    const d = new Date(newDate.year, newDate.month - 1, newDate.day)
    return (
      d.getFullYear() === newDate.year &&
      d.getMonth() + 1 === newDate.month &&
      d.getDate() === newDate.day
    )
  }

  const handleInputChange =
    (field: keyof DateParts) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value ? Number(e.target.value) : ''
      const isValid =
        typeof newValue === 'number' && validateDate(field, newValue)

      const newDate = { ...date, [field]: newValue as number }
      setDate(newDate)

      if (isValid) {
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      }
    }

  const initialDate = useRef<DateParts>(date)

  const handleBlur =
    (field: keyof DateParts) =>
    (e: React.FocusEvent<HTMLInputElement>): void => {
      if (!e.target.value) {
        setDate(initialDate.current)
        return
      }

      const newValue = Number(e.target.value)
      const isValid = validateDate(field, newValue)

      if (!isValid) {
        setDate(initialDate.current)
      } else {
        initialDate.current = { ...date, [field]: newValue }
      }
    }

  const handleKeyDown =
    (field: keyof DateParts) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.metaKey || e.ctrlKey) {
        return
      }

      if (
        !/^[0-9]$/.test(e.key) &&
        ![
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Delete',
          'Tab',
          'Backspace',
          'Enter',
        ].includes(e.key)
      ) {
        e.preventDefault()
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        let newDate = { ...date }

        if (field === 'day') {
          if (
            date[field] === new Date(date.year, date.month, 0).getDate()
          ) {
            newDate = { ...date, [field]: 1 }
          } else {
            newDate = { ...date, [field]: date[field] + 1 }
          }
        } else if (field === 'month') {
          newDate = {
            ...date,
            [field]: date[field] === 12 ? 1 : date[field] + 1,
          }
        } else if (field === 'year') {
          newDate = { ...date, [field]: date[field] + 1 }
        }

        setDate(newDate)
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        let newDate = { ...date }

        if (field === 'day') {
          if (date[field] === 1) {
            newDate = {
              ...date,
              [field]: new Date(date.year, date.month, 0).getDate(),
            }
          } else {
            newDate = { ...date, [field]: date[field] - 1 }
          }
        } else if (field === 'month') {
          newDate = {
            ...date,
            [field]: date[field] === 1 ? 12 : date[field] - 1,
          }
        } else if (field === 'year') {
          newDate = { ...date, [field]: date[field] - 1 }
        }

        setDate(newDate)
        onChange(new Date(newDate.year, newDate.month - 1, newDate.day))
      }
    }

  return (
    <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-8 bg-transparent text-center outline-none"
        value={String(date.day).padStart(2, '0')}
        onChange={handleInputChange('day')}
        onBlur={handleBlur('day')}
        onKeyDown={handleKeyDown('day')}
      />
      <span>/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-8 bg-transparent text-center outline-none"
        value={String(date.month).padStart(2, '0')}
        onChange={handleInputChange('month')}
        onBlur={handleBlur('month')}
        onKeyDown={handleKeyDown('month')}
      />
      <span>/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-12 bg-transparent text-center outline-none"
        value={String(date.year)}
        onChange={handleInputChange('year')}
        onBlur={handleBlur('year')}
        onKeyDown={handleKeyDown('year')}
      />
    </div>
  )
}
