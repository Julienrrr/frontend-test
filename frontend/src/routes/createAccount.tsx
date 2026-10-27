import { useNavigate } from 'react-router'

import { CreateAccountForm } from './accountAccess/_components/CreateAccountForm'

export default function CreateAccountRoute() {
  const navigate = useNavigate()
  return (
    <CreateAccountForm
      onNavigate={(href) => {
        void navigate(href)
      }}
    />
  )
}
