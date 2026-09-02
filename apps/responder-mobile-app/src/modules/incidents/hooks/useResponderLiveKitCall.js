import { useState, useEffect, useRef, useCallback } from 'react';
import { getFirebaseAuth, markIncidentCallConnected } from '@packages/firebase';
import { getApiUrl, apiConfig } from '@/services/api';

let liveKitNativeModule = null;
let livekitClientModule = null;
let globalsRegistered = false;

const LIVEKIT_UNAVAILABLE_MESSAGE =
  'Voice calling requires a development build with WebRTC support. Expo Go does not include the native WebRTC module.';

async function loadLiveKitNative() {
  if (liveKitNativeModule) return liveKitNativeModule;
  liveKitNativeModule = await import('@livekit/react-native');
  return liveKitNativeModule;
}

async function loadLiveKitClient() {
  if (livekitClientModule) return livekitClientModule;
  livekitClientModule = await import('livekit-client');
  return livekitClientModule;
}

async function ensureLiveKitGlobals() {
  try {
    const { registerGlobals } = await loadLiveKitNative();
    if (!globalsRegistered) {
      registerGlobals();
      globalsRegistered = true;
      if (__DEV__) {
        console.debug('[useResponderLiveKitCall] LiveKit globals registered.');
      }
    }
  } catch (err) {
    console.warn('[useResponderLiveKitCall] Failed to register LiveKit globals:', err);
    throw new Error(LIVEKIT_UNAVAILABLE_MESSAGE);
  }
}

/**
 * LiveKit emergency voice calling for the responder mobile app.
 *
 * LiveKit is loaded lazily so the app can boot in Expo Go without the WebRTC
 * native module. Voice calls only work in a dev/production build with WebRTC.
 *
 * @param {Object} options
 * @param {Object|null} options.session - IncidentCallSession from Firebase
 * @param {boolean} options.isActive - whether the call modal is open and ready to connect
 * @param {string} [options.participantName] - optional participant display name
 */
export function useResponderLiveKitCall({ session, isActive, participantName }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [roomState, setRoomState] = useState('disconnected');

  const roomRef = useRef(null);

  const cleanUpRoom = useCallback(async () => {
    try {
      if (roomRef.current) {
        if (__DEV__) {
          console.debug('[useResponderLiveKitCall] Disconnecting room...');
        }
        await roomRef.current.disconnect().catch(() => undefined);
        roomRef.current = null;
      }
      if (liveKitNativeModule) {
        await liveKitNativeModule.AudioSession.stopAudioSession().catch(() => undefined);
      }
    } catch (err) {
      console.warn('[useResponderLiveKitCall] Cleanup warning:', err);
    } finally {
      setIsConnected(false);
      setIsConnecting(false);
      setRoomState('disconnected');
    }
  }, []);

  const connectToLiveKit = useCallback(async () => {
    if (!session || !isActive) return;

    setIsConnecting(true);
    setConnectionError(null);
    setRoomState('connecting');

    try {
      await ensureLiveKitGlobals();
      const { AudioSession } = await loadLiveKitNative();
      const { Room, RoomEvent } = await loadLiveKitClient();

      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;

      if (!currentUser) {
        throw new Error('You must be signed in to connect to the emergency voice room.');
      }

      const idToken = await currentUser.getIdToken(true);
      const roomName =
        session.roomName || session.channelName || `emergency_${session.id || Date.now()}`;
      const name =
        participantName ||
        currentUser.displayName ||
        session.callerName ||
        'Response Unit';

      const tokenUrl = getApiUrl(apiConfig.endpoints.calls?.token || '/api/calls/token');
      if (__DEV__) {
        console.debug(
          '[useResponderLiveKitCall] Requesting voice token from:',
          tokenUrl,
          'room:',
          roomName
        );
      }

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          roomName,
          participantName: name,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || `Server returned status ${res.status} when generating room token.`
        );
      }

      const { token, url: livekitUrl } = await res.json();

      if (!token || !livekitUrl) {
        throw new Error('Invalid calling token received from server.');
      }

      await AudioSession.startAudioSession();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        if (__DEV__) {
          console.debug('[useResponderLiveKitCall] LiveKit room connected successfully.');
        }
        setIsConnected(true);
        setIsConnecting(false);
        setRoomState('connected');
      });

      room.on(RoomEvent.Reconnecting, () => {
        if (__DEV__) {
          console.debug('[useResponderLiveKitCall] LiveKit room reconnecting...');
        }
        setRoomState('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        if (__DEV__) {
          console.debug('[useResponderLiveKitCall] LiveKit room reconnected.');
        }
        setRoomState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        if (__DEV__) {
          console.debug('[useResponderLiveKitCall] LiveKit room disconnected.');
        }
        setIsConnected(false);
        setIsConnecting(false);
        setRoomState('disconnected');
      });

      await room.connect(livekitUrl, token);

      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);

      if (session.id) {
        await markIncidentCallConnected(session.id).catch((e) => {
          console.warn('[useResponderLiveKitCall] markIncidentCallConnected non-blocking error:', e);
        });
      }
    } catch (err) {
      console.error('[useResponderLiveKitCall] LiveKit connection failed:', err);
      setConnectionError(err?.message || 'Failed to establish emergency voice link.');
      setIsConnecting(false);
      setIsConnected(false);
      setRoomState('disconnected');
      await cleanUpRoom();
    }
  }, [session, isActive, participantName, cleanUpRoom]);

  useEffect(() => {
    if (isActive && session) {
      connectToLiveKit();
    } else {
      cleanUpRoom();
    }

    return () => {
      cleanUpRoom();
    };
  }, [isActive, session, connectToLiveKit, cleanUpRoom]);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current || !isConnected) return;
    try {
      const targetState = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!targetState);
      setIsMuted(targetState);
    } catch (err) {
      console.warn('[useResponderLiveKitCall] toggleMute error:', err);
    }
  }, [isMuted, isConnected]);

  const toggleSpeaker = useCallback(async () => {
    try {
      const targetSpeaker = !isSpeakerOn;
      setIsSpeakerOn(targetSpeaker);
    } catch (err) {
      console.warn('[useResponderLiveKitCall] toggleSpeaker error:', err);
    }
  }, [isSpeakerOn]);

  const disconnect = useCallback(async () => {
    await cleanUpRoom();
  }, [cleanUpRoom]);

  return {
    isConnecting,
    isConnected,
    isMuted,
    isSpeakerOn,
    connectionError,
    roomState,
    toggleMute,
    toggleSpeaker,
    disconnect,
  };
}
