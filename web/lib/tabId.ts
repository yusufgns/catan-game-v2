/** Unique ID per browser tab — persists across re-renders but not across tabs. */
let id: string | null = null;

export function getTabId(): string {
  if (!id) id = crypto.randomUUID();
  return id;
}
