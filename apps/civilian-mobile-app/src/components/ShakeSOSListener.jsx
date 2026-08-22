import { useShakeToSOS } from "@/hooks/useShakeToSOS";

/** Invisible global listener — shake phone to trigger SOS confirmation. */
export default function ShakeSOSListener() {
  useShakeToSOS();
  return null;
}
