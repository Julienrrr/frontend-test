import { useNavigate } from 'react-router'

import { CreateAccountForm } from './accountAccess/_components/CreateAccountForm'
import { parseAccountAccessSearch } from './accountAccess/_utils/returnTarget'

import type { Route } from './+types/createAccount'

export function clientLoader({ request }: Route.ClientLoaderArgs) {
  const search = Object.fromEntries(new URL(request.url).searchParams)
  return parseAccountAccessSearch(search)
}

export default function CreateAccountRoute({
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate()
  return (
    <CreateAccountForm
      onNavigate={(href) => {
        void navigate(href)
      }}
      returnTo={loaderData.returnTo}
    />
  )
}
