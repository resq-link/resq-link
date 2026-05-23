# Priority alert sounds (responder mobile)

Default implementation uses **expo-haptics** patterns in `src/services/priorityAlertService.js` (works offline, respects silent mode less intrusively).

Optional: add `.mp3` / `.wav` files here and load with `expo-av` for audible tones in the field.
