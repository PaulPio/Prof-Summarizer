import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  orderBy,
  limit 
} from "firebase/firestore";
import { SavedLecture } from "../types";

const COLLECTION_NAME = 'lectures';

export class FirestoreError extends Error {
  setupUrl?: string;
  constructor(message: string, setupUrl?: string) {
    super(message);
    this.setupUrl = setupUrl;
  }
}

export const StorageService = {
  getLectures: async (userId: string): Promise<SavedLecture[]> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME), 
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedLecture[];
    } catch (error: any) {
      console.error("Firestore Error Details:", error);
      
      const message = error.message || "";
      // Firestore errors often contain a URL to create the missing index
      const urlMatch = message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
      const setupUrl = urlMatch ? urlMatch[0] : undefined;

      if (message.includes('index') || error.code === 'failed-precondition') {
        throw new FirestoreError(
          "A Firestore Index is required to sort your lectures. Please click the 'Setup Index' button or check the browser console for the link.",
          setupUrl
        );
      }
      
      if (error.code === 'permission-denied') {
        throw new FirestoreError("Access Denied. Check your Firestore Security Rules.");
      }
      
      throw error;
    }
  },

  saveLecture: async (lecture: SavedLecture): Promise<string> => {
    try {
      const { id, ...data } = lecture;
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return docRef.id;
    } catch (error: any) {
      console.error("Firestore Save Error:", error);
      throw error;
    }
  },

  deleteLecture: async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error: any) {
      console.error("Firestore Delete Error:", error);
      throw error;
    }
  }
};