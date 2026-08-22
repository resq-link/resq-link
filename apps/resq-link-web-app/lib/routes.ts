export const routes = {
  login: '/login',
  accessDenied: '/access-denied',
  home: '/',

  commandCenter: {
    root: '/command-center',
    overview: '/command-center/overview',
    map: '/command-center/map',
    intake: '/command-center/intake',
    sms: '/command-center/sms',
    incidents: '/command-center/incidents',
    footageRequests: '/command-center/footage-requests',
    resources: '/command-center/resources',
    teams: '/command-center/teams',
    report: '/command-center/report',
    reportIncidents: '/command-center/report/incidents',
    history: '/command-center/history',
    incidentManagement: '/command-center/incident-management',
  },

  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    dispatchers: '/admin/dispatchers',
    responders: '/admin/responders',
    civilians: '/admin/civilians',
    commandCenters: '/admin/command-centers',
    kyc: '/admin/kyc',
    audit: '/admin/audit',
    notifications: '/admin/notifications',
    agencies: '/admin/agencies',
    profile: '/admin/profile',
    settings: '/admin/settings',
  },
} as const

export const WORKSPACE_COOKIE = 'resq_workspace'
