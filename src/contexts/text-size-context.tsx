"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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
  const [textSize, setTextSize] = useState<TextSize>('md')
  const [mounted, setMounted] = useState(false)

  // Load saved text size from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('text-size')
    if (saved && ['xs', 'sm', 'md', 'lg', 'xl'].includes(saved)) {
      setTextSize(saved as TextSize)
    }
    setMounted(true)
  }, [])

  // Save text size to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('text-size', textSize)
      // Apply text size class to document root for global effect
      const root = document.documentElement
      
      // Remove existing text size classes
      root.classList.remove('text-size-xs', 'text-size-sm', 'text-size-md', 'text-size-lg', 'text-size-xl')
      
      // Add the current text size class
      root.classList.add(`text-size-${textSize}`)
      
      // Apply CSS custom properties for global text sizing
      const textSizeMap = {
        xs: { base: '0.75rem', small: '0.6875rem', large: '0.875rem' },   // 12px, 11px, 14px
        sm: { base: '0.875rem', small: '0.75rem', large: '1rem' },        // 14px, 12px, 16px  
        md: { base: '1rem', small: '0.875rem', large: '1.125rem' },       // 16px, 14px, 18px
        lg: { base: '1.125rem', small: '1rem', large: '1.25rem' },        // 18px, 16px, 20px
        xl: { base: '1.25rem', small: '1.125rem', large: '1.5rem' }       // 20px, 18px, 24px
      }
      
      const currentSizes = textSizeMap[textSize]
      root.style.setProperty('--text-size-base', currentSizes.base)
      root.style.setProperty('--text-size-small', currentSizes.small)
      root.style.setProperty('--text-size-large', currentSizes.large)
    }
  }, [textSize, mounted])

  const textSizeClasses = {
    xs: {
      base: 'text-xs',
      heading: 'text-sm',
      small: 'text-xs',
      button: 'text-xs',
      input: 'text-xs'
    },
    sm: {
      base: 'text-sm',
      heading: 'text-base',
      small: 'text-xs',
      button: 'text-sm',
      input: 'text-sm'
    },
    md: {
      base: 'text-base',
      heading: 'text-lg',
      small: 'text-sm',
      button: 'text-base',
      input: 'text-base'
    },
    lg: {
      base: 'text-lg',
      heading: 'text-xl',
      small: 'text-base',
      button: 'text-lg',
      input: 'text-lg'
    },
    xl: {
      base: 'text-xl',
      heading: 'text-2xl',
      small: 'text-lg',
      button: 'text-xl',
      input: 'text-xl'
    }
  }

  const currentClasses = textSizeClasses[textSize]

  if (!mounted) {
    return (
      <TextSizeContext.Provider value={{
        textSize: 'md',
        setTextSize: () => {},
        textSizeClasses: textSizeClasses.md
      }}>
        {children}
      </TextSizeContext.Provider>
    )
  }

  return (
    <TextSizeContext.Provider value={{
      textSize,
      setTextSize,
      textSizeClasses: currentClasses
    }}>
      {children}
    </TextSizeContext.Provider>
  )
}
