/**
 * Firebase utilities export
 * Centralized exports for all Firebase utilities
 */

export * from "./collections";
export * from "./schemas";
export * from "./validated-firestore";

// Re-export Firebase instance for convenience
export { db } from "$lib/firebase";
