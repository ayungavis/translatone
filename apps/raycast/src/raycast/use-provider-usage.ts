import { usePromise } from "@raycast/utils";
import type { ProviderConfig } from "../core/providers";
import { readUsage, type UsageSnapshot } from "../core/usage";
import { localStore } from "./storage";

export interface ProviderUsage {
  readonly provider: ProviderConfig;
  readonly usage: UsageSnapshot;
}

function loadProviderUsage(providers: readonly ProviderConfig[]): Promise<ProviderUsage[]> {
  const now = new Date();
  return Promise.all(
    providers.map(async (provider) => ({
      provider,
      usage: await readUsage(localStore, provider, now),
    })),
  );
}

export function useProviderUsage(providers: readonly ProviderConfig[]) {
  return usePromise(loadProviderUsage, [providers]);
}
