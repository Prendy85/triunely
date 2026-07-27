// src/services/commercialService.js

import { supabase } from "../lib/supabase";

const SUPPORTED_ACCOUNT_TYPES = new Set([
  "user",
  "church",
  "partner",
  "network",
]);

function normaliseAccountType(accountType) {
  if (typeof accountType !== "string") {
    throw new Error("A commercial account type is required.");
  }

  const normalisedAccountType = accountType.trim().toLowerCase();

  if (!SUPPORTED_ACCOUNT_TYPES.has(normalisedAccountType)) {
    throw new Error(
      `Unsupported commercial account type: ${accountType}`
    );
  }

  return normalisedAccountType;
}

function normaliseAccountId(accountId) {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new Error("A commercial account ID is required.");
  }

  return accountId.trim();
}

/**
 * Loads the complete commercial state for one accessible account.
 *
 * This is intentionally the only commercial RPC called by the React app.
 * Entitlements, subscription state and verification state must be read from
 * the returned snapshot rather than queried separately.
 */
export async function getCommercialAccountSnapshot({
  accountType,
  accountId,
}) {
  const safeAccountType = normaliseAccountType(accountType);
  const safeAccountId = normaliseAccountId(accountId);

  const { data, error } = await supabase.rpc(
    "get_commercial_account_snapshot",
    {
      p_account_type: safeAccountType,
      p_account_id: safeAccountId,
    }
  );

  if (error) {
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      "The commercial snapshot RPC returned an invalid response."
    );
  }

  return data;
}