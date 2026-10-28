import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker } from 'react-router'

const leaveMessage =
  'You have unsaved changes. Leave this page without saving them?'

/**
 * Tracks unsaved changes and asks before leaving the page with them, both for
 * in-app navigation (including sign-out) and for reloading or closing the tab.
 */
export function useUnsavedChangesWarning() {
  const [hasUnsavedChanges, setState] = useState(false)
  // Navigation can follow a save in the same tick, before React re-renders with the new state.
  const unsavedChanges = useRef(false)

  const setHasUnsavedChanges = useCallback((value: boolean) => {
    unsavedChanges.current = value
    setState(value)
  }, [])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      unsavedChanges.current &&
      currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }
    // eslint-disable-next-line no-alert -- a native confirm is the simplest accessible prompt; no dialog component exists yet.
    if (window.confirm(leaveMessage)) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return undefined
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasUnsavedChanges])

  return { hasUnsavedChanges, setHasUnsavedChanges }
}
