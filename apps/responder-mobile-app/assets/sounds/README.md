# Priority alert sounds (responder mobile)

`incident_alarm.wav` — the looping alarm for newly assigned incidents.

**Generated, not sourced**, so it carries no licence obligations:

```bash
node scripts/generate-alarm-sound.mjs
```

Two alternating tones (880 Hz / 1175 Hz), 2s, starting and ending in silence so
it loops seamlessly. Mono 44.1 kHz 16-bit PCM — the format Android requires for
a notification channel sound.

It is used in two places, and both must agree on the filename:

- **Android notification channel** `incident-alerts`, bundled by the
  `expo-notifications` plugin entry in `app.json`
- **In-app looping playback** via `expo-audio` in
  `src/services/priorityAlertService.js`

Renaming it means updating `app.json`, `pushNotificationService.js`
(`ALARM_SOUND`), and `functions/src/expoPush.ts` (`ALARM_SOUND`) together.

Haptic patterns still run alongside the sound, so the alert survives a muted
device — see `priorityAlertService.js`.
