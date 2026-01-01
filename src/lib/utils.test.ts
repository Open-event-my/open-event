import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge simple class names', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn('base', isActive && 'active', isDisabled && 'disabled')
    expect(result).toBe('base active')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz')
    expect(result).toBe('foo bar baz')
  })

  it('should handle objects with boolean values', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toBe('foo baz')
  })

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-4 py-2', 'px-6')
    expect(result).toBe('py-2 px-6')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle undefined and null values', () => {
    const result = cn('foo', undefined, null, 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle complex Tailwind merging', () => {
    const result = cn('text-sm text-gray-500', 'text-lg', 'hover:text-blue-500')
    expect(result).toBe('text-gray-500 text-lg hover:text-blue-500')
  })

  it('should handle bg color merging', () => {
    const result = cn('bg-red-500', 'bg-blue-500')
    expect(result).toBe('bg-blue-500')
  })

  it('should handle spacing class merging', () => {
    const result = cn('m-4', 'mx-2')
    expect(result).toBe('m-4 mx-2')
  })

  it('should handle responsive classes', () => {
    const result = cn('text-sm', 'md:text-lg', 'lg:text-xl')
    expect(result).toBe('text-sm md:text-lg lg:text-xl')
  })

  it('should handle mixed input types', () => {
    const shouldSkip = false
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      shouldSkip && 'skipped',
      'final'
    )
    expect(result).toBe('base array-class object-class final')
  })
})
