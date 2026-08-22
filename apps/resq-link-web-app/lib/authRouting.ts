import { routes } from '@/lib/routes'
import { homeForWorkspace, type WebWorkspace } from '@/lib/workspace'

export function destinationForWorkspace(workspace: WebWorkspace, nextPath: string | null): string {
  const home = homeForWorkspace(workspace)
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) return home
  if (workspace === 'super_admin' && nextPath.startsWith(routes.admin.root)) return nextPath
  if (workspace === 'command_center' && nextPath.startsWith(routes.commandCenter.root)) return nextPath
  return home
}

/** Hard navigation ensures middleware sees the freshly issued workspace cookie. */
export function navigateAfterLogin(workspace: WebWorkspace, nextPath: string | null): void {
  window.location.assign(destinationForWorkspace(workspace, nextPath))
}
