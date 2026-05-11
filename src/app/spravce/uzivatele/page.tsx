import { getAdminUsers, getRoles } from '@\/modules\/core\/actions\/adminActions'
import { UserManagement } from './UserManagement'

export default async function UzivateleAdminPage() {
  const [users, roles] = await Promise.all([getAdminUsers(), getRoles()])
  return <UserManagement users={users} roles={roles} />
}
