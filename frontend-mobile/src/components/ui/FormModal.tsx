import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, View } from "react-native";

import { useLockedRedirect } from "@/premium";

// A modal form component that centers its content and handles keyboard avoidance. The backdrop closes the modal when pressed, while the inner panel swallows taps to prevent accidental closure.
export default function FormModal({
  visible,
  onClose,
  children,
  openWhenLocked = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  // For what a locked account can still do, such as reporting an answer
  openWhenLocked?: boolean;
}) {
  // A locked account is sent to the subscribe screen instead of a form it can't save
  const redirected = useLockedRedirect(visible && !openWhenLocked, onClose);
  const show = openWhenLocked ? visible : redirected;

  return (
    <Modal visible={show} animationType="fade" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable onPress={onClose} className="flex-1 justify-center bg-black/70 p-4">
          <Pressable onPress={() => {}}>
            <View className="max-h-full overflow-hidden rounded-2xl border border-border bg-ink">
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                {children}
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}