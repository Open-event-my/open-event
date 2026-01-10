/**
 * Field Validation Hook
 *
 * Provides real-time field validation with automatic error clearing
 * when field values become valid.
 *
 * Requirements: 4.3
 * - Watch field values for changes
 * - Clear error when value becomes valid
 * - Re-validate on blur or submit
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'

/**
 * Validation function type
 */
export type ValidationFn<T> = (value: T) => string | null

/**
 * Field validation state
 */
export interface FieldValidationState {
  /** Current error message (null if valid) */
  error: string | null
  /** Whether the field has been touched (blurred) */
  touched: boolean
  /** Whether the field is currently being validated */
  validating: boolean
  /** Whether the field is valid */
  isValid: boolean
  /** Whether to show the error (touched or submitted) */
  showError: boolean
}

/**
 * Field validation options
 */
export interface FieldValidationOptions<T> {
  /** Validation function */
  validate: ValidationFn<T>
  /** Whether to validate on change (default: true after first blur) */
  validateOnChange?: boolean
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean
  /** Debounce delay for validation in ms (default: 0) */
  debounceMs?: number
  /** Initial value */
  initialValue?: T
}

/**
 * Field validation return type
 */
export interface UseFieldValidationReturn<T> {
  /** Current field value */
  value: T
  /** Set the field value */
  setValue: (value: T) => void
  /** Current validation state */
  state: FieldValidationState
  /** Handle blur event */
  onBlur: () => void
  /** Handle change event */
  onChange: (value: T) => void
  /** Validate the field manually */
  validate: () => string | null
  /** Clear the error */
  clearError: () => void
  /** Reset the field to initial state */
  reset: () => void
  /** Mark as submitted (shows errors even if not touched) */
  markSubmitted: () => void
  /** ARIA props for the input */
  ariaProps: {
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
  }
}

/**
 * Hook for single field validation with automatic error clearing
 *
 * Requirements:
 * - 4.3: Clear error when value becomes valid
 * - 4.3: Re-validate on blur or submit
 *
 * @param fieldName - The field name (for ARIA attributes)
 * @param options - Validation options
 * @returns Field validation utilities
 *
 * @example
 * ```tsx
 * const email = useFieldValidation('email', {
 *   validate: (value) => {
 *     if (!value) return 'Email is required'
 *     if (!isValidEmail(value)) return 'Please enter a valid email'
 *     return null
 *   },
 *   initialValue: '',
 * })
 *
 * return (
 *   <input
 *     value={email.value}
 *     onChange={(e) => email.onChange(e.target.value)}
 *     onBlur={email.onBlur}
 *     {...email.ariaProps}
 *   />
 * )
 * ```
 */
export function useFieldValidation<T>(
  fieldName: string,
  options: FieldValidationOptions<T>
): UseFieldValidationReturn<T> {
  const {
    validate,
    validateOnChange = true,
    validateOnBlur = true,
    debounceMs = 0,
    initialValue,
  } = options

  const [value, setValueState] = useState<T>(initialValue as T)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [validating, setValidating] = useState(false)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const validateRef = useRef(validate)

  // Update ref in effect to avoid updating during render
  useEffect(() => {
    validateRef.current = validate
  }, [validate])

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  /**
   * Validate the current value
   */
  const validateValue = useCallback((val: T): string | null => {
    return validateRef.current(val)
  }, [])

  /**
   * Run validation with optional debounce
   */
  const runValidation = useCallback(
    (val: T, immediate = false) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (immediate || debounceMs === 0) {
        const result = validateValue(val)
        setError(result)
        setValidating(false)
        return result
      }

      setValidating(true)
      debounceTimerRef.current = setTimeout(() => {
        const result = validateValue(val)
        setError(result)
        setValidating(false)
      }, debounceMs)

      return null
    },
    [validateValue, debounceMs]
  )

  /**
   * Handle value change
   * Requirements: 4.3 - Clear error when value becomes valid
   */
  const onChange = useCallback(
    (newValue: T) => {
      setValueState(newValue)

      // Only validate on change if touched or submitted, or if validateOnChange is explicitly true
      if (validateOnChange && (touched || submitted)) {
        runValidation(newValue)
      } else if (error) {
        // If there's an existing error, check if the new value is valid
        // and clear the error immediately if so
        const newError = validateValue(newValue)
        if (newError === null) {
          setError(null)
        }
      }
    },
    [validateOnChange, touched, submitted, runValidation, error, validateValue]
  )

  /**
   * Handle blur event
   * Requirements: 4.3 - Re-validate on blur
   */
  const onBlur = useCallback(() => {
    setTouched(true)
    if (validateOnBlur) {
      runValidation(value, true)
    }
  }, [validateOnBlur, runValidation, value])

  /**
   * Set value directly (without triggering validation)
   */
  const setValue = useCallback((newValue: T) => {
    setValueState(newValue)
  }, [])

  /**
   * Validate manually
   */
  const validateNow = useCallback((): string | null => {
    return runValidation(value, true)
  }, [runValidation, value])

  /**
   * Clear the error
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setValueState(initialValue as T)
    setError(null)
    setTouched(false)
    setSubmitted(false)
    setValidating(false)
  }, [initialValue])

  /**
   * Mark as submitted
   */
  const markSubmitted = useCallback(() => {
    setSubmitted(true)
    runValidation(value, true)
  }, [runValidation, value])

  // Compute derived state
  const isValid = error === null
  const showError = (touched || submitted) && error !== null

  const state: FieldValidationState = useMemo(
    () => ({
      error,
      touched,
      validating,
      isValid,
      showError,
    }),
    [error, touched, validating, isValid, showError]
  )

  // ARIA props for accessibility
  const ariaProps = useMemo(
    () => ({
      'aria-invalid': showError || undefined,
      'aria-describedby': showError ? `${fieldName}-error` : undefined,
    }),
    [showError, fieldName]
  )

  return {
    value,
    setValue,
    state,
    onBlur,
    onChange,
    validate: validateNow,
    clearError,
    reset,
    markSubmitted,
    ariaProps,
  }
}

/**
 * Multi-field validation state
 */
export interface MultiFieldValidationState {
  /** Errors by field name */
  errors: Record<string, string | null>
  /** Touched state by field name */
  touched: Record<string, boolean>
  /** Whether all fields are valid */
  isValid: boolean
  /** Whether any field has been touched */
  anyTouched: boolean
  /** Whether form has been submitted */
  submitted: boolean
  /** First error message */
  firstError: string | null
}

/**
 * Multi-field validation options
 */
export interface MultiFieldValidationOptions<T extends Record<string, unknown>> {
  /** Validation functions by field name */
  validators: { [K in keyof T]?: ValidationFn<T[K]> }
  /** Initial values */
  initialValues: T
  /** Whether to validate on change (default: true after first blur) */
  validateOnChange?: boolean
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean
}

/**
 * Multi-field validation return type
 */
export interface UseMultiFieldValidationReturn<T extends Record<string, unknown>> {
  /** Current field values */
  values: T
  /** Set a field value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void
  /** Set multiple values */
  setValues: (values: Partial<T>) => void
  /** Current validation state */
  state: MultiFieldValidationState
  /** Get props for a field */
  getFieldProps: <K extends keyof T>(
    field: K
  ) => {
    value: T[K]
    onChange: (value: T[K]) => void
    onBlur: () => void
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
  }
  /** Get error for a field */
  getError: <K extends keyof T>(field: K) => string | null
  /** Validate all fields */
  validateAll: () => boolean
  /** Clear all errors */
  clearAllErrors: () => void
  /** Reset to initial state */
  reset: () => void
  /** Mark as submitted */
  markSubmitted: () => void
}

/**
 * Hook for multi-field validation with automatic error clearing
 *
 * Requirements:
 * - 4.3: Clear error when value becomes valid
 * - 4.3: Re-validate on blur or submit
 *
 * @param options - Validation options
 * @returns Multi-field validation utilities
 */
export function useMultiFieldValidation<T extends Record<string, unknown>>(
  options: MultiFieldValidationOptions<T>
): UseMultiFieldValidationReturn<T> {
  const { validators, initialValues, validateOnChange = true, validateOnBlur = true } = options

  const [values, setValuesState] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const validatorsRef = useRef(validators)

  // Update ref in effect to avoid updating during render
  useEffect(() => {
    validatorsRef.current = validators
  }, [validators])

  /**
   * Validate a single field
   */
  const validateField = useCallback(<K extends keyof T>(field: K, value: T[K]): string | null => {
    const validator = validatorsRef.current[field]
    if (!validator) return null
    return validator(value)
  }, [])

  /**
   * Set a single field value
   * Requirements: 4.3 - Clear error when value becomes valid
   */
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }))

      // Validate on change if touched or submitted
      if (validateOnChange && (touched[field as string] || submitted)) {
        const error = validateField(field, value)
        setErrors((prev) => ({ ...prev, [field]: error }))
      } else if (errors[field as string]) {
        // If there's an existing error, check if the new value is valid
        const error = validateField(field, value)
        if (error === null) {
          setErrors((prev) => ({ ...prev, [field]: null }))
        }
      }
    },
    [validateOnChange, touched, submitted, validateField, errors]
  )

  /**
   * Set multiple values
   */
  const setValues = useCallback(
    (newValues: Partial<T>) => {
      setValuesState((prev) => ({ ...prev, ...newValues }))

      // Validate changed fields
      const newErrors: Record<string, string | null> = {}
      for (const [field, value] of Object.entries(newValues)) {
        if (validateOnChange && (touched[field] || submitted)) {
          newErrors[field] = validateField(field as keyof T, value as T[keyof T])
        } else if (errors[field]) {
          const error = validateField(field as keyof T, value as T[keyof T])
          if (error === null) {
            newErrors[field] = null
          }
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...newErrors }))
      }
    },
    [validateOnChange, touched, submitted, validateField, errors]
  )

  /**
   * Handle blur for a field
   * Requirements: 4.3 - Re-validate on blur
   */
  const handleBlur = useCallback(
    <K extends keyof T>(field: K) => {
      setTouched((prev) => ({ ...prev, [field]: true }))

      if (validateOnBlur) {
        const error = validateField(field, values[field])
        setErrors((prev) => ({ ...prev, [field]: error }))
      }
    },
    [validateOnBlur, validateField, values]
  )

  /**
   * Get props for a field
   */
  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => {
      const showError = (touched[field as string] || submitted) && errors[field as string] !== null

      return {
        value: values[field],
        onChange: (value: T[K]) => setValue(field, value),
        onBlur: () => handleBlur(field),
        'aria-invalid': showError || undefined,
        'aria-describedby': showError ? `${String(field)}-error` : undefined,
      }
    },
    [values, setValue, handleBlur, touched, submitted, errors]
  )

  /**
   * Get error for a field
   */
  const getError = useCallback(
    <K extends keyof T>(field: K): string | null => {
      const showError = touched[field as string] || submitted
      if (!showError) return null
      return errors[field as string] || null
    },
    [touched, submitted, errors]
  )

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string | null> = {}
    let isValid = true

    for (const field of Object.keys(validatorsRef.current)) {
      const error = validateField(field as keyof T, values[field as keyof T])
      newErrors[field] = error
      if (error !== null) {
        isValid = false
      }
    }

    setErrors(newErrors)
    setSubmitted(true)
    return isValid
  }, [validateField, values])

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setValuesState(initialValues)
    setErrors({})
    setTouched({})
    setSubmitted(false)
  }, [initialValues])

  /**
   * Mark as submitted
   */
  const markSubmitted = useCallback(() => {
    setSubmitted(true)
    validateAll()
  }, [validateAll])

  // Compute derived state
  const isValid = Object.values(errors).every((e) => e === null)
  const anyTouched = Object.values(touched).some((t) => t)
  const firstError = Object.values(errors).find((e) => e !== null) || null

  const state: MultiFieldValidationState = useMemo(
    () => ({
      errors,
      touched,
      isValid,
      anyTouched,
      submitted,
      firstError,
    }),
    [errors, touched, isValid, anyTouched, submitted, firstError]
  )

  return {
    values,
    setValue,
    setValues,
    state,
    getFieldProps,
    getError,
    validateAll,
    clearAllErrors,
    reset,
    markSubmitted,
  }
}

export default useFieldValidation
