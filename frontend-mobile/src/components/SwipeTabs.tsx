import type { ReactNode } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { router, usePathname } from "expo-router";

// Must match the NativeTabs.Trigger order in (tabs)/_layout.tsx. The swipe direction is only intuitive if it
// matches the order of the bar you can see.
const TABS = ["/", "/records", "/photos", "/chat", "/settings"] as const;

export default function SwipeTabs({ children }: { children: ReactNode }) {
  const path = usePathname();

  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      const i = TABS.indexOf(path as (typeof TABS)[number]);
      if (i < 0) return;
      if (e.translationX < -50 && i < TABS.length - 1) {
        router.navigate(TABS[i + 1]);
      } else if (e.translationX > 50 && i > 0) {
        router.navigate(TABS[i - 1]);
      }
    });

  return <GestureDetector gesture={pan}>{children}</GestureDetector>;
}