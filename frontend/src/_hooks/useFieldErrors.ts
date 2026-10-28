import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>

/**
 * Holds one message per field and, when errors are shown, moves focus to the first
 * invalid field in `fieldOrder` so it is announced together with its message.
 */
export function useFieldErrors<Field extends string>(
  fieldOrder: readonly Field[],
) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({})
  const inputs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({})

  function inputRef(field: Field) {
    return (input: HTMLInputElement | null) => {
      inputs.current[field] = input
    }
  }

  function showFieldErrors(errors: FieldErrors<Field>) {
    // Render the messages before moving focus so the field is announced with its error.
    flushSync(() => setFieldErrors(errors))
    const firstInvalidField = fieldOrder.find((field) => errors[field])
    if (firstInvalidField) {
      inputs.current[firstInvalidField]?.focus()
    }
  }

  function clearFieldError(field: Field) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  function clearFieldErrors() {
    setFieldErrors({})
  }

  return {
    fieldErrors,
    inputRef,
    showFieldErrors,
    clearFieldError,
    clearFieldErrors,
  }
}
