export const queryKeys = {
  incidents: {
    all: ["incidents"] as const,
    assigned: (uid: string) => ["incidents", "assigned", uid] as const,
  },
  responders: {
    onlineCount: ["responders", "onlineCount"] as const,
  },
};
