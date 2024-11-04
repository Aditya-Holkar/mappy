import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as signOutAuth,
} from 'firebase/auth';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
} from 'firebase/firestore';
import { firebaseConfig } from 'src/firebase-config';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  app = initializeApp(firebaseConfig);
  auth = getAuth(this.app);
  googleProvider = new GoogleAuthProvider();
  storage = getStorage(this.app);
  firestore = getFirestore(this.app); // Initialize Firestore

  constructor() {}

  // Sign in with Google
  async signInWithGoogle() {
    try {
      await signInWithPopup(this.auth, this.googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOutAuth(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Upload file to Firebase Storage
  async uploadFile(file: File) {
    const storageRef = ref(this.storage, 'files/' + file.name);
    try {
      await uploadBytes(storageRef, file);
      console.log('File uploaded successfully!');
      return storageRef;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Get values for a selected property from Firestore
  async getValuesForProperty(property: string): Promise<string[]> {
    const values: string[] = [];
    try {
      // Reference to the document within the 'properties' collection
      const propertyDocRef = doc(this.firestore, 'properties', property);
      const propertyDoc = await getDoc(propertyDocRef);

      if (propertyDoc.exists()) {
        const data = propertyDoc.data();
        if (data && data['values']) {
          values.push(...data['values']);
        }
      } else {
        console.log(`No document found for property: ${property}`);
      }
    } catch (error) {
      console.error('Error fetching property values:', error);
    }
    return values;
  }
}
