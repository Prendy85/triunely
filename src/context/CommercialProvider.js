// src/context/CommercialProvider.js

import {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AppState } from "react-native";

import { supabase } from "../lib/supabase";
import { getCommercialAccountSnapshot } from "../services/commercialService";

export const CommercialContext = createContext(null);

const DEFAULT_ACCOUNT_TYPE = "user";

const ENTITLEMENT_KEYS = Object.freeze({
  NATIVE_VIDEO_POSTS: "native_video_posts",
  PERMANENT_VIDEO_UPLOADS: "permanent_video_uploads",
  CAMPAIGN_CREATION: "campaign_creation",
  FAITH_COACH_ACCESS: "faith_coach_access",
  STORY_INSIGHTS_ACCESS: "story_insights_access",
});

function normaliseAccount(account) {
  if (!account || typeof account !== "object") {
    return null;
  }

  const accountType =
    typeof account.accountType === "string"
      ? account.accountType.trim().toLowerCase()
      : "";

  const accountId =
    typeof account.accountId === "string"
      ? account.accountId.trim()
      : "";

  if (!accountType || !accountId) {
    return null;
  }

  return {
    accountType,
    accountId,
  };
}

function entitlementValueIsActive(value) {
  if (value === true) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0;
  }

  if (typeof value === "string") {
    return [
      "true",
      "yes",
      "enabled",
      "active",
      "unlimited",
    ].includes(value.trim().toLowerCase());
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return false;
}

function createDefaultUserAccount(userId) {
  if (typeof userId !== "string" || !userId.trim()) {
    return null;
  }

  return {
    accountType: DEFAULT_ACCOUNT_TYPE,
    accountId: userId.trim(),
  };
}

export function CommercialProvider({ children }) {
  const [snapshot, setSnapshot] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const activeAccountRef = useRef(null);
  const requestIdRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);

  const commitActiveAccount = useCallback((nextAccount) => {
    const safeAccount = normaliseAccount(nextAccount);

    activeAccountRef.current = safeAccount;
    setActiveAccount(safeAccount);

    return safeAccount;
  }, []);

  const clearCommercialState = useCallback(() => {
    requestIdRef.current += 1;
    activeAccountRef.current = null;

    if (!mountedRef.current) {
      return;
    }

    setActiveAccount(null);
    setSnapshot(null);
    setError(null);
    setLoading(false);
  }, []);

  const loadCommercialSnapshot = useCallback(async (account) => {
    const safeAccount = normaliseAccount(account);

    if (!safeAccount) {
      clearCommercialState();
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const nextSnapshot = await getCommercialAccountSnapshot(
        safeAccount
      );

      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return null;
      }

      setSnapshot(nextSnapshot);
      setError(null);

      return nextSnapshot;
    } catch (loadError) {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current
      ) {
        return null;
      }

      console.log(
        "Commercial snapshot load error:",
        loadError
      );

      setSnapshot(null);
      setError(loadError);

      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === requestIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, [clearCommercialState]);

  const refreshCommercial = useCallback(async () => {
    const account = activeAccountRef.current;

    if (!account) {
      clearCommercialState();
      return null;
    }

    return loadCommercialSnapshot(account);
  }, [clearCommercialState, loadCommercialSnapshot]);

  const switchAccount = useCallback(
    async (accountTypeOrAccount, accountId) => {
      const nextAccount =
        accountTypeOrAccount &&
        typeof accountTypeOrAccount === "object"
          ? {
              accountType:
                accountTypeOrAccount.accountType ??
                accountTypeOrAccount.type,
              accountId:
                accountTypeOrAccount.accountId ??
                accountTypeOrAccount.id,
            }
          : {
              accountType: accountTypeOrAccount,
              accountId,
            };

      const safeAccount = normaliseAccount(nextAccount);

      if (!safeAccount) {
        throw new Error(
          "switchAccount requires a valid account type and account ID."
        );
      }

      commitActiveAccount(safeAccount);

      return loadCommercialSnapshot(safeAccount);
    },
    [commitActiveAccount, loadCommercialSnapshot]
  );

  useEffect(() => {
    mountedRef.current = true;

    async function initialiseCommercialState() {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!mountedRef.current) {
        return;
      }

      if (sessionError) {
        console.log(
          "Commercial session load error:",
          sessionError
        );

        setSnapshot(null);
        setError(sessionError);
        setLoading(false);
        return;
      }

      const userId = session?.user?.id;

      if (!userId) {
        clearCommercialState();
        return;
      }

      const userAccount = createDefaultUserAccount(userId);

      commitActiveAccount(userAccount);
      await loadCommercialSnapshot(userAccount);
    }

    initialiseCommercialState();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mountedRef.current) {
          return;
        }

        const userId = session?.user?.id;

        if (event === "SIGNED_OUT" || !userId) {
          clearCommercialState();
          return;
        }

        if (event === "SIGNED_IN") {
          const userAccount =
            createDefaultUserAccount(userId);

          commitActiveAccount(userAccount);

          setTimeout(() => {
            if (mountedRef.current) {
              void loadCommercialSnapshot(userAccount);
            }
          }, 0);

          return;
        }

        if (event === "USER_UPDATED") {
          const currentAccount =
            activeAccountRef.current ??
            createDefaultUserAccount(userId);

          if (!activeAccountRef.current) {
            commitActiveAccount(currentAccount);
          }

          setTimeout(() => {
            if (mountedRef.current) {
              void loadCommercialSnapshot(currentAccount);
            }
          }, 0);

          return;
        }

        if (
          event === "TOKEN_REFRESHED" &&
          !activeAccountRef.current
        ) {
          const userAccount =
            createDefaultUserAccount(userId);

          commitActiveAccount(userAccount);

          setTimeout(() => {
            if (mountedRef.current) {
              void loadCommercialSnapshot(userAccount);
            }
          }, 0);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      subscription?.unsubscribe?.();
    };
  }, [
    clearCommercialState,
    commitActiveAccount,
    loadCommercialSnapshot,
  ]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        const previousAppState = appStateRef.current;
        appStateRef.current = nextAppState;

        const returnedToForeground =
          /inactive|background/.test(previousAppState) &&
          nextAppState === "active";

        if (
          returnedToForeground &&
          activeAccountRef.current
        ) {
          refreshCommercial();
        }
      }
    );

    return () => {
      appStateSubscription.remove();
    };
  }, [refreshCommercial]);

  const entitlements =
    snapshot?.entitlements &&
    typeof snapshot.entitlements === "object" &&
    !Array.isArray(snapshot.entitlements)
      ? snapshot.entitlements
      : {};

  const getEntitlement = useCallback(
    (entitlementKey, fallbackValue = null) => {
      if (
        typeof entitlementKey !== "string" ||
        !entitlementKey.trim()
      ) {
        return fallbackValue;
      }

      const safeKey = entitlementKey.trim();

      if (
        !Object.prototype.hasOwnProperty.call(
          entitlements,
          safeKey
        )
      ) {
        return fallbackValue;
      }

      return entitlements[safeKey];
    },
    [entitlements]
  );

  const hasEntitlement = useCallback(
    (entitlementKey) => {
      return entitlementValueIsActive(
        getEntitlement(entitlementKey, null)
      );
    },
    [getEntitlement]
  );

  const isVerified =
    snapshot?.verification?.approved === true &&
    snapshot?.verification?.is_verified === true;

  const badgeActive =
    snapshot?.verification?.badge_active === true;

  const canPostNativeVideo = hasEntitlement(
    ENTITLEMENT_KEYS.NATIVE_VIDEO_POSTS
  );

  const canUploadPermanentVideo = hasEntitlement(
    ENTITLEMENT_KEYS.PERMANENT_VIDEO_UPLOADS
  );

  const canCreateCampaign = hasEntitlement(
    ENTITLEMENT_KEYS.CAMPAIGN_CREATION
  );

  const canUseFaithCoach = hasEntitlement(
    ENTITLEMENT_KEYS.FAITH_COACH_ACCESS
  );

  const canViewStoryInsights = hasEntitlement(
    ENTITLEMENT_KEYS.STORY_INSIGHTS_ACCESS
  );

  const contextValue = useMemo(
    () => ({
      snapshot,
      loading,
      error,

      activeAccount,
      account: snapshot?.account ?? null,
      plan: snapshot?.plan ?? null,
      subscription: snapshot?.subscription ?? null,
      verification: snapshot?.verification ?? null,
      entitlements,

      refreshCommercial,
      switchAccount,

      isVerified,
      badgeActive,

      hasEntitlement,
      getEntitlement,

      canPostNativeVideo,
      canUploadPermanentVideo,
      canCreateCampaign,
      canUseFaithCoach,
      canViewStoryInsights,
    }),
    [
      snapshot,
      loading,
      error,
      activeAccount,
      entitlements,
      refreshCommercial,
      switchAccount,
      isVerified,
      badgeActive,
      hasEntitlement,
      getEntitlement,
      canPostNativeVideo,
      canUploadPermanentVideo,
      canCreateCampaign,
      canUseFaithCoach,
      canViewStoryInsights,
    ]
  );

  return (
    <CommercialContext.Provider value={contextValue}>
      {children}
    </CommercialContext.Provider>
  );
}