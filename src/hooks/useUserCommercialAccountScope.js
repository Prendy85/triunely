// src/hooks/useUserCommercialAccountScope.js

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

import { supabase } from "../lib/supabase";
import useCommercial from "./useCommercial";

/**
 * Restores the signed-in person's User commercial context whenever a personal
 * or public entry screen gains focus.
 *
 * Use this on top-level screens where organisation management has genuinely
 * ended. Do not use it inside Church, Partner or Network management flows.
 */
export default function useUserCommercialAccountScope(
  enabled = true
) {
  const { activeAccount, switchAccount } =
    useCommercial();

  const requestSequenceRef = useRef(0);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        return undefined;
      }

      requestSequenceRef.current += 1;

      const requestSequence =
        requestSequenceRef.current;

      void (async () => {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            throw error;
          }

          const userId = session?.user?.id;

          if (
            !userId ||
            requestSequence !==
              requestSequenceRef.current
          ) {
            return;
          }

          const alreadyActive =
            activeAccount?.accountType ===
              "user" &&
            activeAccount?.accountId ===
              userId;

          if (alreadyActive) {
            return;
          }

          await switchAccount(
            "user",
            userId
          );
        } catch (error) {
          if (
            requestSequence !==
            requestSequenceRef.current
          ) {
            return;
          }

          console.log(
            "User commercial account scope error:",
            error
          );
        }
      })();

      return () => {
        requestSequenceRef.current += 1;
      };
    }, [
      enabled,
      activeAccount?.accountType,
      activeAccount?.accountId,
      switchAccount,
    ])
  );
}

export { useUserCommercialAccountScope };
