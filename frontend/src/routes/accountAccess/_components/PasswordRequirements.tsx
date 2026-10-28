import { Fragment } from 'react'

import { passwordRequirements } from '../_utils/credentialRules'

import styles from './accountAccess.module.css'

export interface PasswordRequirementsProps {
  password: string
}

/**
 * Shows which password rules are met as the applicant types. It is read with the field
 * rather than announced on every keystroke, and states each result in text, not colour only.
 */
export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  return (
    // Spans with list roles: the field's description slot only accepts inline content.
    <span role="list" className={styles.requirements}>
      {passwordRequirements.map(({ label, isMet }) => {
        const met = isMet(password)
        return (
          // The space between items keeps them apart when read as one description.
          <Fragment key={label}>
            <span
              role="listitem"
              className={[styles.requirement, met && styles.requirementMet]
                .filter(Boolean)
                .join(' ')}
            >
              <span aria-hidden="true">{met ? '✓' : '○'}</span> {label}
              <span className="sr-only">{met ? ', met.' : ', not met.'}</span>
            </span>{' '}
          </Fragment>
        )
      })}
    </span>
  )
}
