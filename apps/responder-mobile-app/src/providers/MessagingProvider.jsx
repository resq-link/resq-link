import React, { createContext, useContext, useMemo, useState } from "react";

const MessagingContext = createContext({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function useMessaging() {
  return useContext(MessagingContext);
}

export default function MessagingProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const value = useMemo(
    () => ({
      unreadCount,
      setUnreadCount,
    }),
    [unreadCount]
  );

  return (
    <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
  );
}
