import React, { useContext, useEffect, useState } from 'react';
import './Tray.css';
import TrayButton, {
  TYPE_ADD_TRACK,
  TYPE_MUTE_CAMERA,
  TYPE_MUTE_MIC,
  TYPE_SCREEN,
  TYPE_LEAVE,
} from '../TrayButton/TrayButton';
import CallObjectContext from '../../CallObjectContext';
import { logDailyEvent } from '../../logUtils';
import DailyIframe from '@daily-co/daily-js';

/**
 * Gets [isCameraMuted, isMicMuted, isSharingScreen].
 * This function is declared outside Tray() so it's not recreated every render
 * (which would require us to declare it as a useEffect dependency).
 */
function getStreamStates(callObject) {
  let isCameraMuted,
    isMicMuted,
    isSharingScreen = false;
  if (
    callObject &&
    callObject.participants() &&
    callObject.participants().local
  ) {
    const localParticipant = callObject.participants().local;
    isCameraMuted = !localParticipant.video;
    isMicMuted = !localParticipant.audio;
    isSharingScreen = localParticipant.screen;
  }
  return [isCameraMuted, isMicMuted, isSharingScreen];
}

/**
 * Props:
 * - onClickLeaveCall: () => ()
 * - disabled: boolean
 */
export default function Tray(props) {
  const callObject = useContext(CallObjectContext);
  const [isCameraMuted, setCameraMuted] = useState(false);
  const [isMicMuted, setMicMuted] = useState(false);
  const [isSharingScreen, setSharingScreen] = useState(false);

  function toggleCamera() {
    callObject.setLocalVideo(isCameraMuted);
  }

  function toggleMic() {
    callObject.setLocalAudio(isMicMuted);
  }

  function toggleSharingScreen() {
    isSharingScreen
      ? callObject.stopScreenShare()
      : callObject.startScreenShare();
  }

  function leaveCall() {
    props.onClickLeaveCall && props.onClickLeaveCall();
  }

  /**
   * Start listening for participant changes when callObject is set (i.e. when the component mounts).
   * This event will capture any changes to your audio/video mute state.
   */
  useEffect(() => {
    if (!callObject) return;

    function handleNewParticipantsState(event) {
      event && logDailyEvent(event);
      const [isCameraMuted, isMicMuted, isSharingScreen] = getStreamStates(
        callObject
      );
      setCameraMuted(isCameraMuted);
      setMicMuted(isMicMuted);
      setSharingScreen(isSharingScreen);
    }

    // Use initial state
    handleNewParticipantsState();

    // Listen for changes in state
    callObject.on('participant-updated', handleNewParticipantsState);

    // Stop listening for changes in state
    return function cleanup() {
      callObject.off('participant-updated', handleNewParticipantsState);
    };
  }, [callObject]);

  async function addCustomAudioTrack() {
    const constraints = {
      // Audio only requests are not supported in Chrome
      // Even though we don't use the video track,
      // we include it in the constraints object
      video: true,
      audio: {
        autoGainControl: true,
        noiseSuppression: true,
        volume: 1,
        sampleRate: 48000
      }
    };

    let stream, audio;

    try {
      stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      audio = stream.getAudioTracks()[0];
      if (audio) {
        try {
          callObject.startScreenShare({ mediaStream: new MediaStream( [audio] ) });
        } catch (e) {
          console.log('error in startScreenShare: ', e);
        }
      }
    } catch (e) {
      console.log('error in getDisplayMedia: ', e);
    }
  }

  return (
    <div className="tray">
      <TrayButton
        type={TYPE_MUTE_CAMERA}
        disabled={props.disabled}
        highlighted={isCameraMuted}
        onClick={toggleCamera}
      />
      <TrayButton
        type={TYPE_MUTE_MIC}
        disabled={props.disabled}
        highlighted={isMicMuted}
        onClick={toggleMic}
      />
      {DailyIframe.supportedBrowser().supportsScreenShare && (
        <TrayButton
          type={TYPE_SCREEN}
          disabled={props.disabled}
          highlighted={isSharingScreen}
          onClick={toggleSharingScreen}
        />
      )}
      <TrayButton
        type={TYPE_ADD_TRACK}
        disabled={props.disabled}
        newButtonGroup={true}
        highlighted={true}
        onClick={addCustomAudioTrack}
      />
      <TrayButton
        type={TYPE_LEAVE}
        disabled={props.disabled}
        newButtonGroup={true}
        highlighted={true}
        onClick={leaveCall}
      />
    </div>
  );
}
