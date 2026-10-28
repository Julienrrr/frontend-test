/**
 * Holds a mocked response until the test opens the gate, so pending states can be
 * asserted without relying on timing.
 */
export function createGate() {
  let open!: () => void
  const opened = new Promise<void>((resolve) => {
    open = resolve
  })
  return { opened, open }
}
