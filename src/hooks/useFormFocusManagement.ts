/**
 * Form Focus Management Hook
 *
 * Provides focus management utilities for forms with validation errors.
 * Focuses the first invalid field on form submission and scrolls it into view.
 *
 * Requirements: 4.2
 * - Focus first invalid field on form submission
 * - Scroll field into view if needed
 */

import { useCallback, useRef, useEffect } from 'react'

/**
 * Options for focusing an element
 */
export interface FocusOptions {
  /** Whether to scroll the element into view (default: true) */
  scrollIntoView?: boolean
  /** Scroll behavior (default: 'smooth') */
  scrollBehavior?: ScrollBehavior
  /** Scroll block position (default: 'center') */
  scrollBlock?: ScrollLogicalPosition
  /** Delay before focusing in ms (default: 0) */
  delay?: number
  /** Whether to prevent scroll (default: false) */
  preventScroll?: boolean
}

/**
 * Default focus options
 */
const defaultFocusOptions: Required<FocusOptions> = {
  scrollIntoView: true,
  scrollBehavior: 'smooth',
  scrollBlock: 'center',
  delay: 0,
  preventScroll: false,
}

/**
 * Focus an element by selector
 *
 * @param selector - CSS selector for the element
 * @param options - Focus options
 * @returns Whether the element was found and focused
 */
export function focusElement(selector: string, options: FocusOptions = {}): boolean {
  const opts = { ...defaultFocusOptions, ...options }

  const focus = () => {
    try {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) return false

      element.focus({ preventScroll: opts.preventScroll })

      if (opts.scrollIntoView && !opts.preventScroll) {
        element.scrollIntoView({
          behavior: opts.scrollBehavior,
          block: opts.scrollBlock,
        })
      }

      return true
    } catch {
      return false
    }
  }

  if (opts.delay > 0) {
    setTimeout(focus, opts.delay)
    return true // Assume it will work
  }

  return focus()
}

/**
 * Focus the first invalid field in a form
 *
 * Requirements: 4.2 - Focus first invalid field on form submission
 *
 * @param formSelector - CSS selector for the form (optional)
 * @param options - Focus options
 * @returns Whether an invalid field was found and focused
 */
export function focusFirstInvalidField(formSelector?: string, options: FocusOptions = {}): boolean {
  const opts = { ...defaultFocusOptions, ...options }

  // Selectors for invalid fields
  const invalidSelectors = [
    '[aria-invalid="true"]',
    '.error input',
    '.error textarea',
    '.error select',
    'input:invalid',
    'textarea:invalid',
    'select:invalid',
    '.invalid',
    '[data-invalid="true"]',
  ]

  const focus = () => {
    try {
      const container = formSelector ? document.querySelector(formSelector) : document

      if (!container) return false

      // Try each selector until we find an invalid field
      for (const selector of invalidSelectors) {
        const element = container.querySelector<HTMLElement>(selector)
        if (element && isElementFocusable(element)) {
          element.focus({ preventScroll: opts.preventScroll })

          if (opts.scrollIntoView && !opts.preventScroll) {
            element.scrollIntoView({
              behavior: opts.scrollBehavior,
              block: opts.scrollBlock,
            })
          }

          return true
        }
      }

      return false
    } catch {
      return false
    }
  }

  if (opts.delay > 0) {
    setTimeout(focus, opts.delay)
    return true
  }

  return focus()
}

/**
 * Focus a field by name
 *
 * @param fieldName - The field name
 * @param options - Focus options
 * @returns Whether the field was found and focused
 */
export function focusFieldByName(fieldName: string, options: FocusOptions = {}): boolean {
  const selectors = [
    `#${fieldName}`,
    `[name="${fieldName}"]`,
    `[data-field="${fieldName}"]`,
    `#${fieldName}-input`,
  ]

  for (const selector of selectors) {
    if (focusElement(selector, options)) {
      return true
    }
  }

  return false
}

/**
 * Check if an element is focusable
 *
 * @param element - The element to check
 * @returns Whether the element is focusable
 */
export function isElementFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled')) return false
  if (element.getAttribute('tabindex') === '-1') return false
  if (element.hasAttribute('hidden')) return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  // Check if it's a naturally focusable element
  const focusableTags = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A']
  if (focusableTags.includes(element.tagName)) return true

  // Check if it has a tabindex
  if (element.hasAttribute('tabindex')) return true

  return false
}

/**
 * Get all invalid fields in a form
 *
 * @param formSelector - CSS selector for the form (optional)
 * @returns Array of invalid field elements
 */
export function getInvalidFields(formSelector?: string): HTMLElement[] {
  const container = formSelector ? document.querySelector(formSelector) : document

  if (!container) return []

  const invalidSelectors = [
    '[aria-invalid="true"]',
    'input:invalid',
    'textarea:invalid',
    'select:invalid',
  ]

  const fields: HTMLElement[] = []
  const seen = new Set<HTMLElement>()

  for (const selector of invalidSelectors) {
    try {
      const elements = container.querySelectorAll<HTMLElement>(selector)
      elements.forEach((el) => {
        if (!seen.has(el) && isElementFocusable(el)) {
          seen.add(el)
          fields.push(el)
        }
      })
    } catch {
      // Invalid selector, skip
    }
  }

  return fields
}

/**
 * Form focus management return type
 */
export interface UseFormFocusManagementReturn {
  /** Focus the first invalid field */
  focusFirstInvalid: (options?: FocusOptions) => boolean
  /** Focus a specific field by name */
  focusField: (fieldName: string, options?: FocusOptions) => boolean
  /** Get all invalid fields */
  getInvalidFields: () => HTMLElement[]
  /** Register the form element */
  formRef: React.RefObject<HTMLFormElement | null>
  /** Handle form submission with focus management */
  handleSubmitWithFocus: (
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>,
    hasErrors: boolean
  ) => (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>
}

/**
 * Hook for form focus management
 *
 * Requirements:
 * - 4.2: Focus first invalid field on form submission
 * - 4.2: Scroll field into view if needed
 *
 * @param formId - Optional form ID for scoping
 * @returns Focus management utilities
 *
 * @example
 * ```tsx
 * function MyForm() {
 *   const { formRef, handleSubmitWithFocus, focusFirstInvalid } = useFormFocusManagement()
 *   const [errors, setErrors] = useState({})
 *
 *   const onSubmit = async (e) => {
 *     e.preventDefault()
 *     const validationErrors = validateForm(formData)
 *     setErrors(validationErrors)
 *
 *     if (Object.keys(validationErrors).length > 0) {
 *       // Focus will be handled automatically
 *       return
 *     }
 *
 *     await submitForm(formData)
 *   }
 *
 *   return (
 *     <form
 *       ref={formRef}
 *       onSubmit={handleSubmitWithFocus(onSubmit, Object.keys(errors).length > 0)}
 *     >
 *       ...
 *     </form>
 *   )
 * }
 * ```
 */
export function useFormFocusManagement(formId?: string): UseFormFocusManagementReturn {
  const formRef = useRef<HTMLFormElement>(null)
  const formSelector = formId ? `#${formId}` : undefined

  /**
   * Focus the first invalid field
   * Requirements: 4.2 - Focus first invalid field on form submission
   */
  const focusFirstInvalid = useCallback(
    (options: FocusOptions = {}): boolean => {
      // Use form ref if available, otherwise use selector
      if (formRef.current) {
        const invalidSelectors = [
          '[aria-invalid="true"]',
          '.error input',
          '.error textarea',
          '.error select',
          'input:invalid',
          'textarea:invalid',
          'select:invalid',
        ]

        for (const selector of invalidSelectors) {
          try {
            const element = formRef.current.querySelector<HTMLElement>(selector)
            if (element && isElementFocusable(element)) {
              const opts = { ...defaultFocusOptions, ...options }

              element.focus({ preventScroll: opts.preventScroll })

              if (opts.scrollIntoView && !opts.preventScroll) {
                element.scrollIntoView({
                  behavior: opts.scrollBehavior,
                  block: opts.scrollBlock,
                })
              }

              return true
            }
          } catch {
            // Invalid selector, try next
          }
        }

        return false
      }

      return focusFirstInvalidField(formSelector, options)
    },
    [formSelector]
  )

  /**
   * Focus a specific field by name
   */
  const focusField = useCallback((fieldName: string, options: FocusOptions = {}): boolean => {
    return focusFieldByName(fieldName, options)
  }, [])

  /**
   * Get all invalid fields in the form
   */
  const getInvalidFieldsInForm = useCallback((): HTMLElement[] => {
    if (formRef.current) {
      const invalidSelectors = [
        '[aria-invalid="true"]',
        'input:invalid',
        'textarea:invalid',
        'select:invalid',
      ]

      const fields: HTMLElement[] = []
      const seen = new Set<HTMLElement>()

      for (const selector of invalidSelectors) {
        try {
          const elements = formRef.current.querySelectorAll<HTMLElement>(selector)
          elements.forEach((el) => {
            if (!seen.has(el) && isElementFocusable(el)) {
              seen.add(el)
              fields.push(el)
            }
          })
        } catch {
          // Invalid selector, skip
        }
      }

      return fields
    }

    return getInvalidFields(formSelector)
  }, [formSelector])

  /**
   * Create a submit handler that focuses the first invalid field on error
   * Requirements: 4.2 - Focus first invalid field on form submission
   */
  const handleSubmitWithFocus = useCallback(
    (
      onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>,
      hasErrors: boolean
    ) => {
      return async (e: React.FormEvent<HTMLFormElement>) => {
        await onSubmit(e)

        // After submit, if there are errors, focus the first invalid field
        // Use a small delay to allow React to update the DOM
        if (hasErrors) {
          setTimeout(() => {
            focusFirstInvalid({ delay: 0 })
          }, 50)
        }
      }
    },
    [focusFirstInvalid]
  )

  return {
    focusFirstInvalid,
    focusField,
    getInvalidFields: getInvalidFieldsInForm,
    formRef,
    handleSubmitWithFocus,
  }
}

/**
 * Hook to focus an element when errors change
 *
 * @param hasErrors - Whether there are errors
 * @param fieldName - Optional specific field to focus
 */
export function useFocusOnError(hasErrors: boolean, fieldName?: string): void {
  const previousHasErrors = useRef(hasErrors)

  useEffect(() => {
    // Only focus when errors appear (transition from no errors to errors)
    if (hasErrors && !previousHasErrors.current) {
      if (fieldName) {
        focusFieldByName(fieldName, { delay: 50 })
      } else {
        focusFirstInvalidField(undefined, { delay: 50 })
      }
    }

    previousHasErrors.current = hasErrors
  }, [hasErrors, fieldName])
}

export default useFormFocusManagement
