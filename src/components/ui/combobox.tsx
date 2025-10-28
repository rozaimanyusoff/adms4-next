"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useTextSize } from "@/contexts/text-size-context"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
  // Optional custom renderer for the option row
  render?: React.ReactNode
}

interface BaseComboboxProps {
  options: ComboboxOption[]
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
  maxItems?: number
}

interface SingleComboboxProps extends BaseComboboxProps {
  multiple?: false
  value?: string
  onValueChange: (value: string) => void
}

interface MultiComboboxProps extends BaseComboboxProps {
  multiple: true
  value?: string[]
  onValueChange: (value: string[]) => void
}

type ComboboxProps = SingleComboboxProps | MultiComboboxProps

export function Combobox(props: ComboboxProps) {
  const {
    options = [],
    placeholder = "Select option...",
    emptyMessage = "No options found.",
    searchPlaceholder = "Search...",
    disabled = false,
    className,
    clearable = false,
    maxItems,
  } = props

  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const { textSizeClasses } = useTextSize()

  const isMultiple = props.multiple === true
  const currentValue = props.value || (isMultiple ? [] : "")

  const selectedOptions = React.useMemo(() => {
    if (isMultiple && Array.isArray(currentValue)) {
      return options.filter(option => currentValue.includes(option.value))
    }
    if (!isMultiple && typeof currentValue === 'string') {
      return options.filter(option => option.value === currentValue)
    }
    return []
  }, [options, currentValue, isMultiple])

  const handleSelect = React.useCallback((selectedValue: string) => {
    if (isMultiple && Array.isArray(currentValue)) {
      const newValue = currentValue.includes(selectedValue)
        ? currentValue.filter(v => v !== selectedValue)
        : maxItems && currentValue.length >= maxItems 
          ? currentValue 
          : [...currentValue, selectedValue]
      ;(props as MultiComboboxProps).onValueChange(newValue)
    } else {
      ;(props as SingleComboboxProps).onValueChange(selectedValue)
    }
  }, [isMultiple, currentValue, props, maxItems])

  const handleClear = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isMultiple) {
      ;(props as MultiComboboxProps).onValueChange([])
    } else {
      ;(props as SingleComboboxProps).onValueChange("")
    }
  }, [isMultiple, props])

  const handleRemoveItem = React.useCallback((itemValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isMultiple && Array.isArray(currentValue)) {
      ;(props as MultiComboboxProps).onValueChange(currentValue.filter(v => v !== itemValue))
    }
  }, [isMultiple, currentValue, props])

  const filteredOptions = React.useMemo(() => {
    return options.filter(option =>
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  const displayValue = React.useMemo(() => {
    if (isMultiple && Array.isArray(currentValue) && currentValue.length > 0) {
      return `${currentValue.length} selected`
    }
    if (!isMultiple && typeof currentValue === 'string') {
      const option = options.find(opt => opt.value === currentValue)
      return option?.label || ""
    }
    return ""
  }, [isMultiple, currentValue, options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-auto min-h-[2.25rem] py-2 bg-inherit hover:bg-inherit",
            textSizeClasses.base,
            className
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1 overflow-hidden">
            {isMultiple && selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1 hover:bg-secondary/80 bg-primary/10 text-primary border border-primary/20"
                >
                  {option.label}
                  <div
                    className="ml-1 rounded-full hover:bg-primary/20 p-0.5 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => handleRemoveItem(option.value, e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRemoveItem(option.value, e as any)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))
            ) : displayValue ? (
              <span className="truncate">{displayValue}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {clearable && (selectedOptions.length > 0 || displayValue) && (
              <div
                className="rounded-sm hover:bg-muted p-1 cursor-pointer"
                onClick={handleClear}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClear(e as any)
                  }
                }}
              >
                <X className="h-4 w-4" />
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[80vw] p-0"
      >
        <Command className="w-full">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions
                .filter(option => option && option.value != null && option.value !== '')
                .map((option, index) => {
                const isSelected = isMultiple && Array.isArray(currentValue)
                  ? currentValue.includes(option.value)
                  : currentValue === option.value

                return (
                  <CommandItem
                    key={`${option.value}-${index}`}
                    value={option.label} // Use label for Command's built-in filtering
                    disabled={option.disabled}
                    onSelect={(currentValue) => {
                      // Find the actual option value based on the selected label
                      const selectedOption = filteredOptions.find(opt => opt.label === currentValue);
                      const actualValue = selectedOption ? selectedOption.value : currentValue;
                      
                      // Prevent default closing behavior
                      if (isMultiple) {
                        // For multi-select, handle selection but don't close
                        handleSelect(actualValue)
                      } else {
                        // For single select, handle selection and close
                        handleSelect(actualValue)
                        setOpen(false)
                      }
                    }}
                    className={cn(
                      "cursor-pointer flex items-center gap-2",
                      textSizeClasses.base,
                      isSelected && "bg-accent"
                    )}
                  >
                    {isMultiple ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        aria-hidden
                        className="mr-2 w-4 h-4 rounded border-gray-300"
                      />
                    ) : (
                      <Check
                        className={cn(
                          "h-4 w-4 font-bold transition-all duration-200",
                          isSelected ? "opacity-100 text-primary scale-100" : "opacity-0 scale-75"
                        )}
                      />
                    )}
                    <span className="flex-1">{option.render ?? option.label}</span>
                    {isMultiple && isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
          {isMultiple && selectedOptions.length > 0 && (
            <div className="p-2 border-t">
              <Button
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Done ({selectedOptions.length} selected)
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Multi-select specific component
export interface MultiSelectProps {
  options: ComboboxOption[]
  value?: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
  maxItems?: number
}

export function MultiSelect(props: MultiSelectProps) {
  return <Combobox {...props} multiple={true} />
}

// Single-select specific component
export interface SingleSelectProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  clearable?: boolean
}

export function SingleSelect(props: SingleSelectProps) {
  return <Combobox {...props} multiple={false} />
}
