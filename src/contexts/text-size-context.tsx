"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react'

type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface TextSizeContextType {
  textSize: TextSize
  setTextSize: (size: TextSize) => void
  textSizeClasses: {
    base: string
    heading: string
    small: string
    button: string
    input: string
  }
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined)

export const useTextSize = () => {
  const context = useContext(TextSizeContext)
  if (!context) {
    throw new Error('useTextSize must be used within a TextSizeProvider')
  }
  return context
}

interface TextSizeProviderProps {
  children: ReactNode
}

export const TextSizeProvider: React.FC<TextSizeProviderProps> = ({ children }) => {
  // Default smaller base to avoid oversized UI on first load
  const [textSize, setTextSize] = useState<TextSize>('sm')
  const [mounted, setMounted] = useState(false)

  // Load saved text size from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('text-size')
      if (saved && ['xs', 'sm', 'md', 'lg', 'xl'].includes(saved)) {
        setTextSize(saved as TextSize)
      }
    } catch (error) {
      console.error('Error loading text size from localStorage:', error)
    }
    setMounted(true)
  }, [])

  // Save text size to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('text-size', textSize)
      } catch (error) {
        console.error('Error saving text size to localStorage:', error)
      }
      
      // Apply text size class to document root for global effect
      const root = document.documentElement
      if (root) {
        // Remove existing text size classes
        root.classList.remove('text-size-xs', 'text-size-sm', 'text-size-md', 'text-size-lg', 'text-size-xl')
        
        // Add the current text size class
        root.classList.add(`text-size-${textSize}`)
        
        // Apply CSS custom properties for global text sizing
        const textSizeMap = {
          xs: { base: '0.625rem', small: '0.5625rem', large: '0.6875rem' }, // 10px, 9px, 11px
          sm: { base: '0.6875rem', small: '0.625rem', large: '0.75rem' },   // 11px, 10px, 12px  
          md: { base: '0.75rem', small: '0.6875rem', large: '0.875rem' },   // 12px, 11px, 14px
          lg: { base: '0.875rem', small: '0.75rem', large: '1rem' },        // 14px, 12px, 16px
          xl: { base: '1rem', small: '0.875rem', large: '1.125rem' }        // 16px, 14px, 18px
        }
        
        const currentSizes = textSizeMap[textSize]
        root.style.setProperty('--text-size-base', currentSizes.base)
        root.style.setProperty('--text-size-small', currentSizes.small)
        root.style.setProperty('--text-size-large', currentSizes.large)
      }
    }
  }, [textSize, mounted])

  // Memoize textSizeClasses to prevent unnecessary re-renders
  const textSizeClasses = useMemo(() => ({
    xs: {
      base: 'text-[10px]',
      heading: 'text-[11px]',
      small: 'text-[9px]',
      button: 'text-[10px]',
      input: 'text-[10px]'
    },
    sm: {
      base: 'text-[11px]',
      heading: 'text-xs',
      small: 'text-[10px]',
      button: 'text-[11px]',
      input: 'text-[11px]'
    },
    md: {
      base: 'text-xs',
      heading: 'text-sm',
      small: 'text-[11px]',
      button: 'text-xs',
      input: 'text-xs'
    },
    lg: {
      base: 'text-sm',
      heading: 'text-base',
      small: 'text-xs',
      button: 'text-sm',
      input: 'text-sm'
    },
    xl: {
      base: 'text-base',
      heading: 'text-lg',
      small: 'text-sm',
      button: 'text-base',
      input: 'text-base'
    }
  }), [])

  const currentClasses = useMemo(() => textSizeClasses[textSize], [textSize, textSizeClasses])

  // Memoize setTextSize to prevent unnecessary re-renders
  const handleSetTextSize = useCallback((size: TextSize) => {
    setTextSize(size)
  }, [])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    textSize,
    setTextSize: handleSetTextSize,
    textSizeClasses: currentClasses
  }), [textSize, handleSetTextSize, currentClasses])

  if (!mounted) {
    return (
      <TextSizeContext.Provider value={{
        textSize: 'sm',
        setTextSize: () => {},
        textSizeClasses: textSizeClasses.sm
      }}>
        {children}
      </TextSizeContext.Provider>
    )
  }

  return (
    <TextSizeContext.Provider value={contextValue}>
      {children}
    </TextSizeContext.Provider>
  )
}
