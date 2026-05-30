/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  collection,
  getDocFromServer
} from "firebase/firestore";
import { MinerProfile, MiningRig, Achievement } from "../types";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Test connection on boot as recommended by the Firebase integration guide
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Define validation/error handling logic as mandated by SKILL.md
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Convert user email to valid document ID
export function getFirebaseDocId(email: string): string {
  return email.toLowerCase().trim().replace(/[^a-zA-Z0-9_-]/g, "_");
}

export interface FirebaseUserRecord {
  email: string;
  passwordHash: string;
  username: string;
  minerTag: string;
  avatar: string;
  role: string;
  level: number;
  experience: number;
  ldrBalance: number;
  rupiahBalance: number;
  highScore: number;
  registeredAt: string;
  // Account-specific structures
  rigsJson?: string;
  achievementsJson?: string;
  dynamiteCount?: number;
  magnetCount?: number;
}

// Sync single user to Firebase database
export async function syncUserProfileToFirebase(
  email: string, 
  passwordHash: string, 
  profile: MinerProfile,
  rigs?: MiningRig[],
  achievements?: Achievement[],
  dynamiteCount?: number,
  magnetCount?: number
): Promise<boolean> {
  const docId = getFirebaseDocId(email);
  const path = `users/${docId}`;
  
  const payload: FirebaseUserRecord = {
    email: email.toLowerCase().trim(),
    passwordHash: passwordHash,
    username: profile.username,
    minerTag: profile.minerTag,
    avatar: profile.avatar,
    role: profile.role,
    level: profile.level,
    experience: profile.experience,
    ldrBalance: profile.ldrBalance,
    rupiahBalance: profile.rupiahBalance,
    highScore: profile.highScore,
    registeredAt: profile.registeredAt,
    ...(rigs && { rigsJson: JSON.stringify(rigs) }),
    ...(achievements && { achievementsJson: JSON.stringify(achievements) }),
    ...(typeof dynamiteCount === "number" && { dynamiteCount }),
    ...(typeof magnetCount === "number" && { magnetCount })
  };

  try {
    const docRef = doc(db, "users", docId);
    await setDoc(docRef, payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Fetch single user from Firebase
export async function fetchUserProfileFromFirebase(email: string): Promise<FirebaseUserRecord | null> {
  const docId = getFirebaseDocId(email);
  const path = `users/${docId}`;

  try {
    const docRef = doc(db, "users", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as FirebaseUserRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Fetch all registered users from Firebase
export async function fetchAllUsersFromFirebase(): Promise<FirebaseUserRecord[]> {
  const path = "users";
  try {
    const collRef = collection(db, "users");
    const snap = await getDocs(collRef);
    const results: FirebaseUserRecord[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as FirebaseUserRecord);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Update user password in Firebase
export async function updateUserPasswordInFirebase(email: string, newPasswordHash: string): Promise<boolean> {
  const docId = getFirebaseDocId(email);
  const path = `users/${docId}`;

  try {
    const docRef = doc(db, "users", docId);
    await updateDoc(docRef, { passwordHash: newPasswordHash });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

// Delete user from Firebase
export async function deleteUserFromFirebase(email: string): Promise<boolean> {
  const docId = getFirebaseDocId(email);
  const path = `users/${docId}`;

  try {
    const docRef = doc(db, "users", docId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

export interface FirebaseDepositRequest {
  id: string;
  email: string;
  username: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

// Create deposit request in Firebase
export async function createDepositRequestInFirebase(
  id: string,
  email: string,
  username: string,
  amount: number,
  method: string
): Promise<boolean> {
  const path = `deposit_requests/${id}`;
  const payload: FirebaseDepositRequest = {
    id,
    email: email.toLowerCase().trim(),
    username,
    amount,
    method,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  try {
    const docRef = doc(db, "deposit_requests", id);
    await setDoc(docRef, payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Fetch all deposit requests from Firebase
export async function fetchAllDepositRequestsFromFirebase(): Promise<FirebaseDepositRequest[]> {
  const path = "deposit_requests";
  try {
    const collRef = collection(db, "deposit_requests");
    const snap = await getDocs(collRef);
    const results: FirebaseDepositRequest[] = [];
    snap.forEach((doc) => {
      results.push(doc.data() as FirebaseDepositRequest);
    });
    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Update deposit request status and update user's balance synchronously
export async function processDepositRequestInFirebase(
  requestId: string,
  userEmail: string,
  status: 'completed' | 'failed'
): Promise<boolean> {
  const path = `deposit_requests/${requestId}`;
  try {
    const reqRef = doc(db, "deposit_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return false;

    const reqData = reqSnap.data() as FirebaseDepositRequest;
    if (reqData.status !== 'pending') return false; // already done

    // 1. Update request status
    await updateDoc(reqRef, { status });

    // 2. If approved/completed, update user's balance
    if (status === 'completed') {
      const userDocId = getFirebaseDocId(userEmail);
      const userRef = doc(db, "users", userDocId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as FirebaseUserRecord;
        const currentRp = userData.rupiahBalance || 0;
        const nextRp = currentRp + reqData.amount;
        await updateDoc(userRef, { rupiahBalance: nextRp });
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}
