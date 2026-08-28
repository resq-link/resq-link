import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { registerGlobals, AudioSession } from '@livekit/react-native';
import { Room, RoomEvent } from 'livekit-client';
import { getFirebaseAuth, markIncidentCallConnected } from '@packages/firebase';
import { getApiUrl, apiConfig } from '@/services/api';
import { appDebug, appError, appWarn } from '@/utils/logger';

let globalsRegistered = false;

function ensureLiveKitGlobals() {
  if (!globalsRegistered) {
    try {
      registerGlobals();
      globalsRegistered = true;
      appDebug('[useLiveKitCall] LiveKit globals registered.');
    } catch (err) {
      appWarn('[useLiveKitCall] Failed to register LiveKit globals:', err);
    }
  }
}

/**
 * Custom hook for LiveKit emergency voice calling in civilian mobile app.
 *
 * @param {Object} options
 * @param {Object|null} options.session - IncidentCallSession object from Firebase
 * @param {boolean} options.isActive - whether the call modal is open and active
 * @param {string} [options.participantName] - optional participant display name
 */
export function useLiveKitCall({ session, isActive, participantName }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [roomState, setRoomState] = useState('disconnected'); // disconnected | connecting | connected | reconnecting

  const roomRef = useRef(null);

  const cleanUpRoom = useCallback(async () => {
    try {
      if (roomRef.current) {
        appDebug('[useLiveKitCall] Disconnecting room...');
        await roomRef.current.disconnect().catch(() => undefined);
        roomRef.current = null;
      }
      await AudioSession.stopAudioSession().catch(() => undefined);
    } catch (err) {
      appWarn('[useLiveKitCall] Cleanup warning:', err);
    } finally {
      setIsConnected(false);
      setIsConnecting(false);
      setRoomState('disconnected');
    }
  }, []);

  const connectToLiveKit = useCallback(async () => {
    if (!session || !isActive) return;

    ensureLiveKitGlobals();
    setIsConnecting(true);
    setConnectionError(null);
    setRoomState('connecting');

    try {
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;

      if (!currentUser) {
        throw new Error('You must be signed in to connect to the emergency voice room.');
      }

      const idToken = await currentUser.getIdToken(true);
      const roomName = session.roomName || session.channelName || `emergency_${session.id || Date.now()}`;
      const name = participantName || currentUser.displayName || session.callerName || 'Citizen in Need';

      const tokenUrl = getApiUrl(apiConfig.endpoints.calls?.token || '/api/calls/token');
      appDebug('[useLiveKitCall] Requesting voice token from:', tokenUrl, 'room:', roomName);

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
        throw new Error(errJson.error || `Server returned status ${res.status} when generating room token.`);
      }

      const { token, url: livekitUrl } = await res.json();

      if (!token || !livekitUrl) {
        throw new Error('Invalid calling token received from server.');
      }

      // Configure native audio session for voice call
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
        appDebug('[useLiveKitCall] LiveKit room connected successfully.');
        setIsConnected(true);
        setIsConnecting(false);
        setRoomState('connected');
      });

      room.on(RoomEvent.Reconnecting, () => {
        appDebug('[useLiveKitCall] LiveKit room reconnecting...');
        setRoomState('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        appDebug('[useLiveKitCall] LiveKit room reconnected.');
        setRoomState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        appDebug('[useLiveKitCall] LiveKit room disconnected.');
        setIsConnected(false);
        setIsConnecting(false);
        setRoomState('disconnected');
      });

      // Connect to LiveKit SFU server
      await room.connect(livekitUrl, token);

      // Publish local microphone track
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);

      // Notify backend / Firestore that the call is connected
      if (session.id) {
        await markIncidentCallConnected(session.id).catch((e) => {
          appWarn('[useLiveKitCall] markIncidentCallConnected non-blocking error:', e);
        });
      }
    } catch (err) {
      appError('[useLiveKitCall] LiveKit connection failed:', err);
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
      appWarn('[useLiveKitCall] toggleMute error:', err);
    }
  }, [isMuted, isConnected]);

  const toggleSpeaker = useCallback(async () => {
    try {
      const targetSpeaker = !isSpeakerOn;
      setIsSpeakerOn(targetSpeaker);
    } catch (err) {
      appWarn('[useLiveKitCall] toggleSpeaker error:', err);
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
