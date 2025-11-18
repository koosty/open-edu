// Admin access control utilities for Open-EDU v1.1.0
// Handles role verification and admin route protection

import { authState } from "$lib/auth.svelte";
import type { User } from "$lib/types";

/**
 * Check if the current user has admin privileges
 */
export function isAdmin(user?: User | null): boolean {
  const currentUser = user ?? authState.user;
  return currentUser?.role === "admin" || currentUser?.role === "instructor";
}

/**
 * Check if the current user has instructor privileges
 */
export function isInstructor(user?: User | null): boolean {
  const currentUser = user ?? authState.user;
  return currentUser?.role === "instructor" || currentUser?.role === "admin";
}

/**
 * Check if user can manage courses (admin or instructor)
 */
export function canManageCourses(user?: User | null): boolean {
  return isInstructor(user);
}

/**
 * Check if user can manage all courses (admin only)
 */
export function canManageAllCourses(user?: User | null): boolean {
  const currentUser = user ?? authState.user;
  return currentUser?.role === "admin";
}

/**
 * Check if user can manage a specific course
 */
export function canManageCourse(
  courseInstructorId: string,
  user?: User | null,
): boolean {
  const currentUser = user ?? authState.user;

  if (!currentUser) return false;

  // Admins can manage any course
  if (currentUser.role === "admin") return true;

  // Instructors can only manage their own courses
  if (currentUser.role === "instructor") {
    return currentUser.id === courseInstructorId;
  }

  return false;
}

/**
 * Get user's access level
 */
export function getUserAccessLevel(
  user?: User | null,
): "admin" | "instructor" | "student" {
  const currentUser = user ?? authState.user;
  return currentUser?.role ?? "student";
}

/**
 * Check if user has elevated privileges (admin or instructor)
 */
export function hasElevatedPrivileges(user?: User | null): boolean {
  return isInstructor(user);
}
