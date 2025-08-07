/**
 * Combobox Component Examples
 * 
 * This file demonstrates how to use the custom Combobox components that provide
 * Select2-like functionality with filtering and multi-select capabilities.
 */

import React, { useState } from 'react'
import { Combobox, MultiSelect, SingleSelect, type ComboboxOption } from './combobox'

// Sample data
const countries: ComboboxOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'au', label: 'Australia' },
  { value: 'sg', label: 'Singapore' },
  { value: 'my', label: 'Malaysia' },
  { value: 'th', label: 'Thailand' },
]

const languages: ComboboxOption[] = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
]

export function ComboboxExamples() {
  // Single select state
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  
  // Multi select state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Single Select Examples</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Country (Basic)
            </label>
            <SingleSelect
              options={countries}
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              placeholder="Choose a country..."
              searchPlaceholder="Search countries..."
              clearable
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Country (Clearable)
            </label>
            <Combobox
              options={countries}
              value={selectedCountry}
              onValueChange={setSelectedCountry}
              placeholder="Choose a country..."
              searchPlaceholder="Search countries..."
              clearable={true}
              emptyMessage="No countries found."
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Multi Select Examples</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Languages (Multi-select)
            </label>
            <MultiSelect
              options={languages}
              value={selectedLanguages}
              onValueChange={setSelectedLanguages}
              placeholder="Choose languages..."
              searchPlaceholder="Search languages..."
              clearable
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Select Languages (Limited to 3)
            </label>
            <Combobox
              multiple={true}
              options={languages}
              value={selectedLanguages}
              onValueChange={setSelectedLanguages}
              placeholder="Choose up to 3 languages..."
              searchPlaceholder="Search languages..."
              maxItems={3}
              clearable
            />
          </div>
        </div>
      </div>

      {/* Display selected values */}
      <div className="border-t pt-6">
        <h3 className="text-md font-medium mb-2">Selected Values</h3>
        <div className="text-sm space-y-1">
          <p><strong>Country:</strong> {selectedCountry || 'None'}</p>
          <p><strong>Languages:</strong> {selectedLanguages.length > 0 ? selectedLanguages.join(', ') : 'None'}</p>
        </div>
      </div>
    </div>
  )
}

export default ComboboxExamples
