// src/hooks/useCommercialAccountScope.js

import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef } from "react";

import useCommercial from "./useCommercial";

function normaliseScope(accountType, accountId) {
  const safeAccountType =
    typeof accountType === "string"
      ? accountType.trim().toLowerCase()
      : "";

  const safeAccountId =
    typeof accountId === "string"
      ? accountId.trim()
      : "";

  if (!safeAccountType || !safeAccountId) {
    return null;
  }

  return {
    accountType: safeAccountType,
    accountId: safeAccountId,
  };
}

/**
 * Activates a commercial account whenever the screen gains focus.
 *
 * This hook intentionally does not restore the User account when the screen
 * loses focus. Management screens frequently navigate to related child
 * screens, and those screens must continue using the same Church, Partner or
 * Network commercial context.
 *
 * Public and personal entry screens are responsible for explicitly restoring
 * the signed-in User commercial context when they regain focus.
 */
export default function useCommercialAccountScope(
  accountType,
  accountId,
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

      const scope = normaliseScope(
        accountType,
        accountId
      );

      if (!scope) {
        return undefined;
      }

      const alreadyActive =
        activeAccount?.accountType ===
          scope.accountType &&
        activeAccount?.accountId ===
          scope.accountId;

      if (alreadyActive) {
        return undefined;
      }

      requestSequenceRef.current += 1;

      const requestSequence =
        requestSequenceRef.current;

      void switchAccount(
        scope.accountType,
        scope.accountId
      ).catch((error) => {
        if (
          requestSequence !==
          requestSequenceRef.current
        ) {
          return;
        }

        console.log(
          "Commercial account scope error:",
          error
        );
      });

      return () => {
        /*
         * Invalidate any error handling associated with this particular focus
         * cycle. Do not restore the User context here because the next screen
         * may be another management screen for the same organisation.
         */
        requestSequenceRef.current += 1;
      };
    }, [
      accountType,
      accountId,
      enabled,
      activeAccount?.accountType,
      activeAccount?.accountId,
      switchAccount,
    ])
  );
}

export { useCommercialAccountScope };
