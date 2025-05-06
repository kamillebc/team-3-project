// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4deQlDiPMEu5D87-Q4O0ESO2JrNvQtow",
  authDomain: "fomofinder-a9ceb.firebaseapp.com",
  projectId: "fomofinder-a9ceb",
  storageBucket: "fomofinder-a9ceb.firebasestorage.app",
  messagingSenderId: "426291571705",
  appId: "1:426291571705:web:8578354d9a3864332a6b28"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
import { doc, setDoc } from 'firebase/firestore';

export const createUserProfile = async (user) => {
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  
  try {
    // Create user document in Firestore
    await setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email,
      photoURL: user.photoURL || null,
      createdAt: new Date().toISOString(),
    }, { merge: true }); // merge: true prevents overwriting if document exists
    
    console.log('User profile created successfully');
    return userRef;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// 4. Integration with Registration Flow
// Example signup function

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';


export const signUpUser = async (email, password, displayName) => {
  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: displayName
    });
    
    // Create user profile in Firestore
    await createUserProfile(user);
    
    return user;
  } catch (error) {
    console.error('Error during signup:', error);
    throw error;
  }
};


