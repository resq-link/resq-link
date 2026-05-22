import { useCallback, useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import Constants from "expo-constants";
import { fetchAgoraRtcToken, getAgoraAppId } from "@/services/agoraVoice";

const requestMicrophonePermission = async () => {
  if (Platform.OS === "android") {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return Platform.OS !== "web";
};

const loadAgora = () => {
  if (Platform.OS === "web") {
    throw new Error("Agora voice calls require an Expo development build on a device.");
  }
  return require("react-native-agora");
};

export function useAgoraVoiceCall() {
  const engineRef = useRef(null);
  const eventHandlerRef = useRef(null);
  const [state, setState] = useState({
    phase: "idle",
    muted: false,
    speakerEnabled: true,
    error: "",
  });

  const cleanup = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine) return;
    try {
      await engine.leaveChannel();
      if (eventHandlerRef.current && engine.unregisterEventHandler) {
        engine.unregisterEventHandler(eventHandlerRef.current);
      }
      engine.release?.();
    } catch (error) {
      console.warn("Agora cleanup failed:", error);
    } finally {
      engineRef.current = null;
      eventHandlerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    cleanup();
  }, [cleanup]);

  const join = useCallback(async ({ incidentId, channelName, onJoined, onRemoteJoined, onError }) => {
    try {
      const appId = getAgoraAppId();
      if (!appId) {
        throw new Error("Agora App ID is not configured.");
      }

      if (Constants.appOwnership === "expo") {
        setState((current) => ({
          ...current,
          phase: "ringing",
          error: "Expo Go can create the call request, but real Agora audio requires an Expo development build.",
        }));
        return;
      }

      const hasMic = await requestMicrophonePermission();
      if (!hasMic) {
        throw new Error("Microphone permission is required for voice calls.");
      }

      setState((current) => ({ ...current, phase: "joining", error: "" }));
      const tokenPayload = await fetchAgoraRtcToken({ incidentId, channelName });
      const Agora = loadAgora();
      const engine = Agora.createAgoraRtcEngine();
      const handler = {
        onJoinChannelSuccess: () => {
          setState((current) => ({ ...current, phase: "connected" }));
          onJoined?.();
        },
        onUserJoined: () => {
          onRemoteJoined?.();
        },
        onLeaveChannel: () => {
          setState((current) => ({ ...current, phase: "ended" }));
        },
        onError: (_err, msg) => {
          const message = msg || "Agora voice call failed.";
          setState((current) => ({ ...current, phase: "failed", error: message }));
          onError?.(new Error(message));
        },
      };

      engine.initialize({ appId });
      engine.registerEventHandler(handler);
      engine.setChannelProfile?.(Agora.ChannelProfileType.ChannelProfileCommunication);
      engine.enableAudio();
      engine.setEnableSpeakerphone?.(true);
      engineRef.current = engine;
      eventHandlerRef.current = handler;

      if (engine.joinChannelWithUserAccount) {
        engine.joinChannelWithUserAccount(
          tokenPayload.token,
          channelName,
          tokenPayload.uid,
          { clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster }
        );
      } else {
        engine.joinChannel(tokenPayload.token, channelName, 0, {
          clientRoleType: Agora.ClientRoleType.ClientRoleBroadcaster,
        });
      }
    } catch (error) {
      const message = error?.message || "Voice call failed. Your report remains submitted.";
      setState((current) => ({ ...current, phase: "failed", error: message }));
      onError?.(error);
      await cleanup();
      throw error;
    }
  }, [cleanup]);

  const leave = useCallback(async () => {
    await cleanup();
    setState((current) => ({ ...current, phase: "ended" }));
  }, [cleanup]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !state.muted;
    engineRef.current?.muteLocalAudioStream?.(nextMuted);
    setState((current) => ({ ...current, muted: nextMuted }));
  }, [state.muted]);

  const toggleSpeaker = useCallback(async () => {
    const nextSpeaker = !state.speakerEnabled;
    engineRef.current?.setEnableSpeakerphone?.(nextSpeaker);
    setState((current) => ({ ...current, speakerEnabled: nextSpeaker }));
  }, [state.speakerEnabled]);

  return {
    ...state,
    join,
    leave,
    toggleMute,
    toggleSpeaker,
  };
}
