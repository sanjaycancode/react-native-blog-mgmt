import { useRouter } from "expo-router";
import { HeaderBackButton as RNHeaderBackButton } from "expo-router/react-navigation";

import type { ComponentProps } from "react";

type RNHeaderBackButtonProps = ComponentProps<typeof RNHeaderBackButton>;

export function HeaderBackButton(props: RNHeaderBackButtonProps) {
  const router = useRouter();

  if (!router.canGoBack()) return null;

  const isRouteGroupLabel = /^\([^)]+\)$/.test(props.label?.trim() ?? "");

  const handlePress: RNHeaderBackButtonProps["onPress"] = () => {
    if (props.onPress) {
      props.onPress();
      return;
    }
    router.back();
  };

  return (
    <RNHeaderBackButton
      {...props}
      accessibilityLabel={isRouteGroupLabel ? "Go back" : props.accessibilityLabel}
      displayMode={isRouteGroupLabel ? "minimal" : props.displayMode}
      label={isRouteGroupLabel ? undefined : props.label}
      truncatedLabel={isRouteGroupLabel ? undefined : props.truncatedLabel}
      onPress={handlePress}
    />
  );
}
