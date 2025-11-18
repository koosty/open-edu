import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { User } from "./types";
import { browser } from "$app/environment";

// Convert Firebase User to our User type
function mapFirebaseUser(firebaseUser: FirebaseUser, userData?: any): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    lastLoginAt:
      firebaseUser.metadata.lastSignInTime || new Date().toISOString(),

    // v1.1.0 additions with defaults
    role: userData?.role || "student",
    enrolledCourses: userData?.enrolledCourses || [],
    completedCourses: userData?.completedCourses || [],
    achievements: userData?.achievements || [],
    totalPoints: userData?.totalPoints || 0,
    streakDays: userData?.streakDays || 0,
    preferences: userData?.preferences || {
      notifications: true,
      theme: "system",
      language: "en",
    },
  };
}

// Shared reactive state object - this is allowed to export since we update properties, not reassign the object
export const authState = $state({
  user: null as User | null,
  loading: browser,
  error: null as string | null,
});

// Initialize auth state listener - only in browser
export function initializeAuth() {
  if (!browser) return;

  onAuthStateChanged(auth, async (firebaseUser) => {
    authState.loading = true;
    authState.error = null;

    if (firebaseUser) {
      try {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userData = userDoc.data();

        authState.user = {
          ...mapFirebaseUser(firebaseUser, userData),
        };
      } catch (error) {
        console.error("Error fetching user data:", error);
        authState.user = mapFirebaseUser(firebaseUser);
      }
    } else {
      authState.user = null;
    }

    authState.loading = false;
  });
}

// Google OAuth authentication
export async function signInWithGoogle(): Promise<User> {
  if (!browser)
    throw new Error("Auth functions can only be called in the browser");

  try {
    authState.error = null;
    const provider = new GoogleAuthProvider();

    // Configure Google provider
    provider.addScope("email");
    provider.addScope("profile");

    const result = await signInWithPopup(auth, provider);

    // Check if user document exists and get user data
    const userDocRef = doc(db, "users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    const isNewUser = !userDoc.exists();
    const existingUserData = userDoc.data();
    const user = mapFirebaseUser(result.user, existingUserData);

    // Create or update user document in Firestore
    const userUpdateData = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: new Date().toISOString(),
      // v1.1.0 defaults for new users
      ...(isNewUser && {
        createdAt: new Date().toISOString(),
        role: "student",
        enrolledCourses: [],
        completedCourses: [],
        achievements: [],
        totalPoints: 0,
        streakDays: 0,
        preferences: {
          notifications: true,
          theme: "system",
          language: "en",
        },
      }),
    };

    await setDoc(userDocRef, userUpdateData, { merge: true });

    return user;
  } catch (error: any) {
    authState.error = error.message;
    throw error;
  }
}

export async function logout(): Promise<void> {
  if (!browser)
    throw new Error("Auth functions can only be called in the browser");

  try {
    authState.error = null;
    await signOut(auth);
  } catch (error: any) {
    authState.error = error.message;
    throw error;
  }
}

export async function updateUserProfile(
  updates: Partial<Pick<User, "displayName" | "photoURL">>,
): Promise<void> {
  if (!browser)
    throw new Error("Auth functions can only be called in the browser");

  if (!auth.currentUser) {
    throw new Error("No user is currently signed in");
  }

  try {
    authState.error = null;

    // Update Firestore document (Firebase Auth profile is managed by Google)
    await setDoc(doc(db, "users", auth.currentUser.uid), updates, {
      merge: true,
    });

    // Update local state
    if (authState.user) {
      authState.user = { ...authState.user, ...updates };
    }
  } catch (error: any) {
    authState.error = error.message;
    throw error;
  }
}
