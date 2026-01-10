import { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useMutation } from '@apollo/client';
import { CREATE_USER, CreateUserData, CreateUserInput } from '@/api/createUser';

export interface AuthError {
  code: string;
  message: string;
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [createUserMutation] = useMutation<CreateUserData, CreateUserInput>(CREATE_USER);

  // Sign up with email and password
  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ): Promise<UserCredential | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const idToken = await userCredential.user.getIdToken();
      
      await createUserMutation({
        variables: {
          idToken,
          firstName,
          lastName,
        },
      });
      
      setLoading(false);
      return userCredential;
    } catch (err: any) {
      setError({
        code: err.code,
        message: err.message,
      });
      setLoading(false);
      return null;
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<UserCredential | null> => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return userCredential;
    } catch (err: any) {
      setError({
        code: err.code,
        message: err.message,
      });
      setLoading(false);
      return null;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async (
    firstName?: string,
    lastName?: string
  ): Promise<UserCredential | null> => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      try {
        const idToken = await userCredential.user.getIdToken();
        const displayName = userCredential.user.displayName || '';
        const [first = '', last = ''] = displayName.split(' ');
        
        await createUserMutation({
          variables: {
            idToken,
            firstName: firstName || first || 'User',
            lastName: lastName || last || '',
          },
        });
      } catch (dbError: any) {
        // User might already exist in DB, which is fine for sign-in
        console.log('User may already exist in database:', dbError.message);
      }
      
      setLoading(false);
      return userCredential;
    } catch (err: any) {
      setError({
        code: err.code,
        message: err.message,
      });
      setLoading(false);
      return null;
    }
  };

  // Sign out
  const logOut = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await signOut(auth);
      setLoading(false);
      return true;
    } catch (err: any) {
      setError({
        code: err.code,
        message: err.message,
      });
      setLoading(false);
      return false;
    }
  };

  return {
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    loading,
    error,
  };
};
