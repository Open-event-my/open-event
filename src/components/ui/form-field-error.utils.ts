/**
 * Form Field Error Utilities
 *
 * Utility functions for form field error handling.
 */

/**
 * Generate the error element ID for ARIA association
 * @param fieldName - The field name
 * @returns The error element ID
 */
export function getErrorId(fieldName: string): string {
  return `${fieldName}-error`
}

/**
 * Generate the suggestion element ID for ARIA association
 * @param fieldName - The field name
 * @returns The suggestion element ID
 */
export function getSuggestionId(fieldName: string): string {
  return `${fieldName}-suggestion`
}

/**
 * Get the combined aria-describedby value for a field with error
 * @param fieldName - The field name
 * @param hasSuggestion - Whether there's a suggestion
 * @returns The aria-describedby value
 */
export function getAriaDescribedBy(fieldName: string, hasSuggestion: boolean): string {
  const ids = [getErrorId(fieldName)]
  if (hasSuggestion) {
    ids.push(getSuggestionId(fieldName))
  }
  return ids.join(' ')
}
