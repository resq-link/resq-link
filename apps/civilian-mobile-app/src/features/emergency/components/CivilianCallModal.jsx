import React, { useState, useEffect } from "react";

/**
 * Lazy shell for the emergency voice modal.
 * LiveKit/WebRTC loads only when `visible` is true so Expo Go can boot.
 */
export default function CivilianCallModal(props) {
  const { visible } = props;
  const [ModalContent, setModalContent] = useState(null);

  useEffect(() => {
    if (!visible) {
      setModalContent(null);
      return;
    }

    let cancelled = false;
    import("./CivilianCallModalContent")
      .then((mod) => {
        if (!cancelled) setModalContent(() => mod.default);
      })
      .catch((err) => {
        console.warn("[CivilianCallModal] Failed to load voice call UI:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible || !ModalContent) return null;

  return <ModalContent {...props} />;
}
