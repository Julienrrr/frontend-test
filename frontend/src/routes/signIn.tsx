import { useNavigate } from 'react-router'

import { SignInForm } from './accountAccess/_components/SignInForm'
import { parseAccountAccessSearch } from './accountAccess/_utils/returnTarget'

import type { Route } from './+types/signIn'

export function clientLoader({ request }: Route.ClientLoaderArgs) {
  const search = Object.fromEntries(new URL(request.url).searchParams)
  return parseAccountAccessSearch(search)
}

export default function SignInRoute({ loaderData }: Route.ComponentProps) {
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
      returnTo={loaderData.returnTo}
    />
  )
}
