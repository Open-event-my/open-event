/**
 * Form Validation Hook
 *
 * Provides a reusable hook for form validation with:
 * - Real-time field validation
 * - Form-level validation before submission
 * - Clear error messages
 * - Touch tracking for better UX
 *
 * Validates: Requirements 11.9, 11.10
 */

import { useState, useCallback, useMemo } from 'react'
import type {
  FormSchema,
  FormValidationResult,
  FieldValidationResult,
} from '@/lib/formValidation'
import { validateField, validateForm } from '@/lib/formValidation'

/**
 * Form validation state
 */
export interface FormValidationState {
  /** Current validation errors by field */
  errors: Record<string, string[]>
  /** First error message for each field (for display) */
  fieldErrors: Record<string, string>
  /** Fields that have been touched (interacted with) */
  touched: Record<string, boolean>
  /** Whether the form has been submitted at least once */
  isSubmitted: boolean
  /** Whether the form is currently valid */
  isValid: boolean
  /** First error message in the form */
  firstError: string | null
}

/**
 * Form validation hook return type
 */
export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  /** Current validation state */
  state: FormValidationState
  /** Validate a single field */
  validateFieldValue: (fieldName: keyof T, value: unknown) => FieldValidationResult
  /** Validate the entire form */
  validateFormData: (formData: T) => FormValidationResult
  /** Mark a field as touched */
  touchField: (fieldName: keyof T) => void
  /** Mark multiple fields as touched */
  touchFields: (fieldNames: (keyof T)[]) => void
  /** Clear error for a specific field */
  clearFieldError: (fieldName: keyof T) => void
  /** Clear all errors */
  clearAllErrors: () => void
  /** Reset the validation state */
  reset: () => void
  /** Get error message for a field (only if touched or submitted) */
  getFieldError: (fieldName: keyof T) => string | undefined
  /** Check if a field has an error (only if touched or submitted) */
  hasFieldError: (fieldName: keyof T) => boolean
  /** Handle form submission with validation */
  handleSubmit: (
    formData: T,
    onValid: (data: T) => void | Promise<void>,
    onInvalid?: (errors: Record<string, string[]>) => void
  ) => Promise<void>
  /** Set errors manually (e.g., from server validation) */
  setErrors: (errors: Record<string, string[]>) => void
  /** Set a single field error manually */
  setFieldError: (fieldName: keyof T, error: string) => void
}

/**
 * Initial validation state
 */
const initialState: FormValidationState = {
  errors: {},
  fieldErrors: {},
  touched: {},
  isSubmitted: false,
  isValid: true,
  firstError: null,
}

/**
 * Form validation hook
 *
 * @param schema - The validation schema for the form
 * @param options - Optional configuration
 * @returns Form validation utilities and state
 *
 * @example
 * ```tsx
 * const schema = createFormSchema({
 *   email: {
 *     required: true,
 *     rules: [ValidationRules.email()],
 *   },
 *   password: {
 *     required: true,
 *     rules: [ValidationRules.minLength(8)],
 *   },
 * })
 *
 * function MyForm() {
 *   const [formData, setFormData] = useState({ email: '', password: '' })
 *   const validation = useFormValidation(schema)
 *
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault()
 *     await validation.handleSubmit(formData, async (data) => {
 *       // Form is valid, submit data
 *       await submitToServer(data)
 *     })
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={formData.email}
 *         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 *         onBlur={() => validation.touchField('email')}
 *         className={validation.hasFieldError('email') ? 'error' : ''}
 *       />
 *       {validation.getFieldError('email') && (
 *         <span className="error">{validation.getFieldError('email')}</span>
 *       )}
 *     </form>
 *   )
 * }
 * ```
 */
export function useFormValidation<T extends Record<string, unknown>>(
  schema: FormSchema,
  options?: {
    /** Validate on blur (default: true) */
    validateOnBlur?: boolean
    /** Validate on change after first submission (default: true) */
    validateOnChangeAfterSubmit?: boolean
  }
): UseFormValidationReturn<T> {
  const { validateOnBlur = true } = options || {}

  const [state, setState] = useState<FormValidationState>(initialState)

  /**
   * Validate a single field
   */
  const validateFieldValue = useCallback(
    (fieldName: keyof T, value: unknown, formData?: T): FieldValidationResult => {
      const fieldSchema = schema[fieldName as string]
      if (!fieldSchema) {
        return { isValid: true, errors: [] }
      }

      const result = validateField(
        value,
        fieldSchema,
        fieldName as string,
        formData as Record<string, unknown>
      )

      setState((prev) => {
        const newErrors = { ...prev.errors }
        const newFieldErrors = { ...prev.fieldErrors }

        if (result.isValid) {
          delete newErrors[fieldName as string]
          delete newFieldErrors[fieldName as string]
        } else {
          newErrors[fieldName as string] = result.errors
          newFieldErrors[fieldName as string] = result.errors[0] || ''
        }

        const isValid = Object.keys(newErrors).length === 0
        const firstError = Object.values(newErrors).flat()[0] || null

        return {
          ...prev,
          errors: newErrors,
          fieldErrors: newFieldErrors,
          isValid,
          firstError,
        }
      })

      return result
    },
    [schema]
  )

  /**
   * Validate the entire form
   */
  const validateFormData = useCallback(
    (formData: T): FormValidationResult => {
      const result = validateForm(formData as Record<string, unknown>, schema)

      setState((prev) => ({
        ...prev,
        errors: result.errors,
        fieldErrors: result.fieldErrors,
        isValid: result.isValid,
        firstError: result.firstError,
        isSubmitted: true,
      }))

      return result
    },
    [schema]
  )

  /**
   * Mark a field as touched
   */
  const touchField = useCallback((fieldName: keyof T) => {
    setState((prev) => ({
      ...prev,
      touched: {
        ...prev.touched,
        [fieldName as string]: true,
      },
    }))
  }, [])

  /**
   * Mark multiple fields as touched
   */
  const touchFields = useCallback((fieldNames: (keyof T)[]) => {
    setState((prev) => {
      const newTouched = { ...prev.touched }
      for (const fieldName of fieldNames) {
        newTouched[fieldName as string] = true
      }
      return {
        ...prev,
        touched: newTouched,
      }
    })
  }, [])

  /**
   * Clear error for a specific field
   */
  const clearFieldError = useCallback((fieldName: keyof T) => {
    setState((prev) => {
      const newErrors = { ...prev.errors }
      const newFieldErrors = { ...prev.fieldErrors }
      delete newErrors[fieldName as string]
      delete newFieldErrors[fieldName as string]

      const isValid = Object.keys(newErrors).length === 0
      const firstError = Object.values(newErrors).flat()[0] || null

      return {
        ...prev,
        errors: newErrors,
        fieldErrors: newFieldErrors,
        isValid,
        firstError,
      }
    })
  }, [])

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: {},
      fieldErrors: {},
      isValid: true,
      firstError: null,
    }))
  }, [])

  /**
   * Reset the validation state
   */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  /**
   * Get error message for a field (only if touched or submitted)
   */
  const getFieldError = useCallback(
    (fieldName: keyof T): string | undefined => {
      const shouldShowError =
        state.isSubmitted ||
        (validateOnBlur && state.touched[fieldName as string])

      if (!shouldShowError) return undefined

      return state.fieldErrors[fieldName as string]
    },
    [state.isSubmitted, state.touched, state.fieldErrors, validateOnBlur]
  )

  /**
   * Check if a field has an error (only if touched or submitted)
   */
  const hasFieldError = useCallback(
    (fieldName: keyof T): boolean => {
      const shouldShowError =
        state.isSubmitted ||
        (validateOnBlur && state.touched[fieldName as string])

      if (!shouldShowError) return false

      return !!state.fieldErrors[fieldName as string]
    },
    [state.isSubmitted, state.touched, state.fieldErrors, validateOnBlur]
  )

  /**
   * Handle form submission with validation
   */
  const handleSubmit = useCallback(
    async (
      formData: T,
      onValid: (data: T) => void | Promise<void>,
      onInvalid?: (errors: Record<string, string[]>) => void
    ): Promise<void> => {
      const result = validateFormData(formData)

      if (result.isValid) {
        await onValid(formData)
      } else {
        onInvalid?.(result.errors)
      }
    },
    [validateFormData]
  )

  /**
   * Set errors manually (e.g., from server validation)
   */
  const setErrors = useCallback((errors: Record<string, string[]>) => {
    const fieldErrors: Record<string, string> = {}
    for (const [field, fieldErrs] of Object.entries(errors)) {
      fieldErrors[field] = fieldErrs[0] || ''
    }

    const isValid = Object.keys(errors).length === 0
    const firstError = Object.values(errors).flat()[0] || null

    setState((prev) => ({
      ...prev,
      errors,
      fieldErrors,
      isValid,
      firstError,
    }))
  }, [])

  /**
   * Set a single field error manually
   */
  const setFieldError = useCallback((fieldName: keyof T, error: string) => {
    setState((prev) => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName as string]: [error],
      },
      fieldErrors: {
        ...prev.fieldErrors,
        [fieldName as string]: error,
      },
      isValid: false,
      firstError: prev.firstError || error,
    }))
  }, [])

  return useMemo(
    () => ({
      state,
      validateFieldValue,
      validateFormData,
      touchField,
      touchFields,
      clearFieldError,
      clearAllErrors,
      reset,
      getFieldError,
      hasFieldError,
      handleSubmit,
      setErrors,
      setFieldError,
    }),
    [
      state,
      validateFieldValue,
      validateFormData,
      touchField,
      touchFields,
      clearFieldError,
      clearAllErrors,
      reset,
      getFieldError,
      hasFieldError,
      handleSubmit,
      setErrors,
      setFieldError,
    ]
  )
}

export default useFormValidation
