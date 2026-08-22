import { routes } from './routes'

export type WebWorkspace = 'super_admin' | 'command_center' | 'unauthorized'

export function homeForWorkspace(workspace: WebWorkspace | null): string {
  if (workspace === 'super_admin') return routes.admin.dashboard
  if (workspace === 'command_center') return routes.commandCenter.overview
  return routes.login
}

export function isSuperAdminWorkspace(workspace: WebWorkspace | null): boolean {
  return workspace === 'super_admin'
}

export function isCommandCenterWorkspace(workspace: WebWorkspace | null): boolean {
  return workspace === 'command_center'
}
