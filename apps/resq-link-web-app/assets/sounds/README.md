# Priority alert sounds (dispatcher web)

Tiered alerts are generated programmatically via Web Audio API in `utils/priorityAlertSound.ts` (no binary assets required for default operation).

Optional future assets (drop files here and wire in `priorityAlertSound.ts`):

| File | Priority | Behavior |
|------|----------|----------|
| `critical-siren.mp3` | CRITICAL | Loop until acknowledged |
| `high-triple-beep.mp3` | HIGH | Repeat every 4s |
| `medium-double-beep.mp3` | MEDIUM | Play once |
| `low-soft-tone.mp3` | LOW | Play once |

Keep files short (&lt; 500KB) and normalized volume for command-center speakers.
