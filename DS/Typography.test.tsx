import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { Typography } from './Primitives'

describe('Typography', () => {
  it('forwards its ref to the rendered element', () => {
    const ref = createRef<HTMLElement>()
    render(
      <Typography component="h1" ref={ref} tabIndex={-1}>
        Account created
      </Typography>,
    )

    expect(ref.current).toBe(screen.getByRole('heading', { level: 1 }))
  })
})
