import { useNavigate } from 'react-router'

import { SignInForm } from './accountAccess/_components/SignInForm'

export default function SignInRoute() {
  const navigate = useNavigate()
  return (
    <SignInForm
      onNavigate={(href) => {
        void navigate(href)
      }}
      onSuccess={(href) => {
        // Replace the sign-in entry so Back does not return to the form once signed in.
        void navigate(href, { replace: true })
      }}
    />
  )
}
