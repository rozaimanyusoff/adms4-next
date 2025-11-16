'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center space-x-1',
        nav_button:
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1 text-sm',
        head_row: 'flex',
        head_cell:
          'text-muted-foreground rounded-md w-9 font-normal text-[0.75rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative',
        day: 'h-9 w-9 p-0 font-normal rounded-md aria-selected:opacity-100',
        day_selected:
          'bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
        day_range_start:
          'day-range-start bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
        day_range_end:
          'day-range-end bg-slate-900 text-white hover:bg-slate-900 hover:text-white',
        day_today: 'bg-accent text-accent-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle:
          'aria-selected:bg-slate-900/10 aria-selected:text-slate-900',
        day_hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
