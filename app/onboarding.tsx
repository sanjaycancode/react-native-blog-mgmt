import { useRouter } from "expo-router";

import OnboardingScreen from "@/components/onboarding/OnboardingScreeen";

export default function OnboardingRoute() {
  const router = useRouter();

  return <OnboardingScreen onFinish={() => router.replace("/")} />;
}
