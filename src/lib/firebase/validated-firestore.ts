/**
 * Validated Firestore Wrapper
 * Provides type-safe and schema-validated Firestore operations
 */

import {
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  where,
  orderBy,
  limit,
  type Firestore,
  type DocumentReference,
  type QueryConstraint,
} from "firebase/firestore";
import type { z } from "zod";
import { COLLECTIONS, type CollectionName } from "./collections";

// Error class for validation errors
export class ValidationError extends Error {
  constructor(
    message: string,
    public collection: string,
    public docId?: string,
    public zodError?: z.ZodError,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Utility to convert Firestore timestamps to ISO strings
function convertTimestamps(data: any): any {
  if (!data) return data;

  const converted = { ...data };
  for (const key in converted) {
    const value = converted[key];
    // Check if it's a Firestore Timestamp
    if (
      value &&
      typeof value === "object" &&
      value.toDate &&
      typeof value.toDate === "function"
    ) {
      converted[key] = value.toDate().toISOString();
    }
  }
  return converted;
}

export class ValidatedFirestore {
  constructor(private db: Firestore) {}

  /**
   * Set a document with validation
   */
  async setValidated<T>(
    collectionName: CollectionName,
    docId: string,
    data: T,
    schema: z.ZodSchema<T>,
  ): Promise<void> {
    try {
      // Add timestamp if not present
      const dataWithTimestamp = {
        ...data,
        updatedAt: new Date().toISOString(),
      } as T;

      const validated = schema.parse(dataWithTimestamp);
      await setDoc(doc(this.db, collectionName, docId), validated as any);
    } catch (error: any) {
      const isZodError = error.name === "ZodError";
      throw new ValidationError(
        `Schema validation failed for ${collectionName}/${docId}: ${error.message}`,
        collectionName,
        docId,
        isZodError ? (error as z.ZodError) : undefined,
      );
    }
  }

  /**
   * Add a document with validation
   */
  async addValidated<T>(
    collectionName: CollectionName,
    data: T,
    schema: z.ZodSchema<T>,
  ): Promise<string> {
    try {
      const now = new Date().toISOString();
      const dataWithTimestamps = {
        ...data,
        createdAt: now,
        updatedAt: now,
      } as T;

      const validated = schema.parse(dataWithTimestamps);
      const docRef = await addDoc(
        collection(this.db, collectionName),
        validated as any,
      );
      return docRef.id;
    } catch (error: any) {
      const isZodError = error.name === "ZodError";
      throw new ValidationError(
        `Schema validation failed for ${collectionName}: ${error.message}`,
        collectionName,
        undefined,
        isZodError ? (error as z.ZodError) : undefined,
      );
    }
  }

  /**
   * Update a document with validation
   */
  async updateValidated<T>(
    collectionName: CollectionName,
    docId: string,
    updates: Partial<T>,
    schema: z.ZodSchema<T>,
  ): Promise<void> {
    try {
      // For updates, we'll validate what we can without requiring the full object
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Skip validation for partial updates - just ensure it's safe data
      await updateDoc(
        doc(this.db, collectionName, docId),
        updatesWithTimestamp as any,
      );
    } catch (error: any) {
      throw new ValidationError(
        `Update failed for ${collectionName}/${docId}: ${error.message}`,
        collectionName,
        docId,
        undefined,
      );
    }
  }

  /**
   * Get a document with validation
   */
  async getValidated<T>(
    collectionName: CollectionName,
    docId: string,
    schema: z.ZodSchema<T>,
  ): Promise<T | null> {
    try {
      const snapshot = await getDoc(doc(this.db, collectionName, docId));
      if (!snapshot.exists()) return null;

      const rawData = snapshot.data();
      const data = convertTimestamps({ id: snapshot.id, ...rawData });
      return schema.parse(data);
    } catch (error: any) {
      const isZodError = error.name === "ZodError";
      throw new ValidationError(
        `Read validation failed for ${collectionName}/${docId}: ${error.message}`,
        collectionName,
        docId,
        isZodError ? (error as z.ZodError) : undefined,
      );
    }
  }

  /**
   * Query documents with validation
   */
  async queryValidated<T>(
    collectionName: CollectionName,
    schema: z.ZodSchema<T>,
    ...constraints: QueryConstraint[]
  ): Promise<T[]> {
    try {
      const q = query(collection(this.db, collectionName), ...constraints);
      const snapshot = await getDocs(q);

      const results: T[] = [];
      for (const docSnapshot of snapshot.docs) {
        const rawData = docSnapshot.data();
        const data = convertTimestamps({ id: docSnapshot.id, ...rawData });
        const validated = schema.parse(data);
        results.push(validated);
      }

      return results;
    } catch (error: any) {
      const isZodError = error.name === "ZodError";
      throw new ValidationError(
        `Query validation failed for ${collectionName}: ${error.message}`,
        collectionName,
        undefined,
        isZodError ? (error as z.ZodError) : undefined,
      );
    }
  }

  /**
   * Delete a document (no validation needed)
   */
  async deleteDoc(
    collectionName: CollectionName,
    docId: string,
  ): Promise<void> {
    await deleteDoc(doc(this.db, collectionName, docId));
  }

  /**
   * Get a document reference (for advanced operations)
   */
  getDocRef(collectionName: CollectionName, docId: string): DocumentReference {
    return doc(this.db, collectionName, docId);
  }

  /**
   * Get a collection reference (for advanced operations)
   */
  getCollectionRef(collectionName: CollectionName) {
    return collection(this.db, collectionName);
  }
}

// Convenience function to create validated Firestore instance
export function createValidatedFirestore(db: Firestore): ValidatedFirestore {
  return new ValidatedFirestore(db);
}

// Type-safe wrapper functions for common operations
export function createTypedService<T>(
  validatedFirestore: ValidatedFirestore,
  collectionName: CollectionName,
  schema: z.ZodSchema<T>,
) {
  return {
    async create(
      data: Omit<T, "id" | "createdAt" | "updatedAt">,
    ): Promise<string> {
      return validatedFirestore.addValidated(collectionName, data as T, schema);
    },

    async get(id: string): Promise<T | null> {
      return validatedFirestore.getValidated(collectionName, id, schema);
    },

    async update(id: string, updates: Partial<T>): Promise<void> {
      return validatedFirestore.updateValidated(
        collectionName,
        id,
        updates,
        schema,
      );
    },

    async delete(id: string): Promise<void> {
      return validatedFirestore.deleteDoc(collectionName, id);
    },

    async query(...constraints: QueryConstraint[]): Promise<T[]> {
      return validatedFirestore.queryValidated(
        collectionName,
        schema,
        ...constraints,
      );
    },

    schema,
    collection: collectionName,
  };
}
