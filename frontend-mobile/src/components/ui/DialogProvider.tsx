import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";

import Button from "@/components/ui/Button";

// Provides a context for displaying modal dialogs (confirmations, notices, and choice prompts) throughout the app. This allows any component to trigger a dialog and handle the user's response in a consistent manner.

export type Choice = { label: string; variant?: "primary" | "secondary" | "danger" };

type Request = { title: string; message?: string; choices: Choice[] };

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
};

type DialogApi = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  notice: (title: string, message?: string) => void;
  choose: (title: string, choices: Choice[]) => Promise<number | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error("useDialog must be used inside DialogProvider");
  return api;
}

export default function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<Request | null>(null);
  // The resolver outlives the render that created it, so it belongs in a ref rather than in state.
  const resolve = useRef<((index: number | null) => void) | null>(null);

  const ask = useCallback((next: Request) => {
    return new Promise<number | null>((done) => {
      resolve.current = done;
      setRequest(next);
    });
  }, []);

  // Settles the current request with the given index, then clears it and the resolver.
  const settle = useCallback((index: number | null) => {
    setRequest(null);
    resolve.current?.(index);
    resolve.current = null;
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: async ({ title, message, confirmLabel, destructive }) => {
        const picked = await ask({
          title,
          message,
          choices: [
            { label: confirmLabel, variant: destructive ? "danger" : "primary" },
            { label: t("common.cancel"), variant: "secondary" },
          ],
        });
        return picked === 0;
      },
      notice: (title, message) => {
        ask({ title, message, choices: [{ label: t("common.close"), variant: "secondary" }] });
      },
      choose: (title, choices) => ask({ title, choices }),
    }),
    [ask, t],
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={request !== null}
        animationType="fade"
        transparent
        onRequestClose={() => settle(null)}
      >
        <Pressable
          onPress={() => settle(null)}
          className="flex-1 items-center justify-center bg-black/70 p-6"
        >
          <Pressable onPress={() => {}} className="w-full max-w-sm">
            <View className="rounded-2xl border border-border bg-ink p-5">
              <Text className="text-lg font-semibold text-fg">{request?.title}</Text>
              {request?.message ? <Text className="mt-2 text-muted">{request.message}</Text> : null}
              <View className="mt-5 gap-2">
                {request?.choices.map((choice, index) => (
                  <Button
                    key={choice.label}
                    label={choice.label}
                    variant={choice.variant}
                    onPress={() => settle(index)}
                  />
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}