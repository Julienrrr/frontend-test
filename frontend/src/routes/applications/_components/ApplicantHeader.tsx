import { Button, Typography } from '@kyc/ui'
import { Form, useNavigation } from 'react-router'

import styles from './applicantHeader.module.css'

const signOutPath = '/sign-out'

export function ApplicantHeader() {
  const navigation = useNavigation()
  const isSigningOut =
    navigation.state !== 'idle' && navigation.formAction === signOutPath

  return (
    <header className={styles.header}>
      <Typography component="p" variant="subheading">
        KYC Application
      </Typography>
      {/* A navigation, not a direct API call, so unsaved-changes prompts run before the session ends. */}
      <Form method="post" action={signOutPath}>
        <Button
          className={styles.signOut}
          isPending={isSigningOut}
          type="submit"
          variant="quiet"
        >
          {isSigningOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </Form>
    </header>
  )
}
