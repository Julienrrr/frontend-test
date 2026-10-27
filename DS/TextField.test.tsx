import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TextField } from './Primitives'

function describedByText(input: HTMLElement): string {
  return (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent)
    .join(' ')
}

describe('TextField', () => {
  it('links helper text to the input as its description', () => {
    render(
      <TextField label="Password" helperText="Use at least 6 characters." />,
    )

    const input = screen.getByLabelText('Password')
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(describedByText(input)).toContain('Use at least 6 characters.')
  })

  it('keeps helper text and announces the error message when invalid', () => {
    render(
      <TextField
        label="Password"
        helperText="Use at least 6 characters."
        errorMessage="Enter a password."
      />,
    )

    const input = screen.getByLabelText('Password')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(describedByText(input)).toContain('Use at least 6 characters.')
    expect(describedByText(input)).toContain('Enter a password.')
  })
})
