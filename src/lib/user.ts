/**
 * Single-user scoping (spec §4: "users may be thin or absent if an auth
 * provider owns identity"). Until real auth is wired in, every request is
 * scoped to one userId from the environment. Swap this out for the auth
 * provider's subject id later — nothing else in the data layer changes.
 */
export function getUserId(): string {
  return process.env.DEFAULT_USER_ID ?? "local-user";
}
