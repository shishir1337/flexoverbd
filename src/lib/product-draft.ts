/**
 * The placeholder title a freshly created product draft carries.
 *
 * Lives here rather than beside `createDraftProduct` because that file is a
 * `"use server"` module, and those may only export async functions — a plain
 * constant there breaks every import of the module, not just its own.
 */
export const DRAFT_TITLE = "Untitled product";
