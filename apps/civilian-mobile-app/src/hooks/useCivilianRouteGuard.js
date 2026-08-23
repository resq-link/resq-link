import { useEffect } from "react";
import { useRouter } from "expo-router";
import useUserStore from "@/stores/userStore";
import { UI_MODE } from "@/services/api";

/**
 * Redirect civilians away from main app routes until email + KYC are complete.
 */
export default function useCivilianRouteGuard() {
  const router = useRouter();
  const { user, isLoading } = useUserStore();

  useEffect(() => {
    if (isLoading || UI_MODE) return;

    const status = user?.status;
    if (!user?.uid) {
      router.replace("/login");
      return;
    }
    if (status === "pending_email_verification") {
      router.replace("/email-verification");
      return;
    }
    if (status === "pending_kyc_review" || status === "rejected") {
      router.replace("/account-pending");
    }
  }, [user, isLoading, router]);
}
