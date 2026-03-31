import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs, addDoc, getDoc, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  quotaExceeded: boolean;
  resetQuota: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAuthReady: false,
  quotaExceeded: false,
  resetQuota: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const updateInProgress = React.useRef(false);
  const hasUpdatedThisSession = React.useRef(false);
  const profileUnsubRef = React.useRef<(() => void) | null>(null);

  const isInitialLoad = React.useRef(true);

  const startProfileSync = (user: User, profileDocId: string, profileRef: any) => {
    // Clean up existing listener if any
    if (profileUnsubRef.current) {
      profileUnsubRef.current();
    }

    console.log(`Starting profile sync for ${profileDocId}`);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (!docSnap.exists()) {
        console.warn("Profile document does not exist anymore.");
        localStorage.removeItem(`profile_id_${user.email}`);
        setProfile(null);
        setUser(null); // Ensure user is also cleared if profile is gone
        setLoading(false);
        setIsAuthReady(true);
        return;
      }

      const data = docSnap.data();
      if (!data) {
        console.error("Profile data is null.");
        setProfile(null);
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
        return;
      }

      const newProfile = { id: docSnap.id, ...data } as UserProfile;
      
      // Cache the profile locally
      try {
        const safeProfile = JSON.parse(JSON.stringify(newProfile, (key, value) => {
          if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'DocumentReference') {
            return value.path;
          }
          if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Timestamp') {
            return value.toDate().toISOString();
          }
          return value;
        }));
        localStorage.setItem(`cached_profile_${user.email}`, JSON.stringify(safeProfile));
      } catch (e) {
        console.warn("Failed to cache profile safely:", e);
      }
      
      // CRITICAL: Set user and profile together only after verification
      setProfile(newProfile);
      setUser(user);
      
      // Update online status and UID if not set or if status changed
      const wasOffline = !data.isOnline;
      const needsUpdate = (wasOffline || data.uid !== user.uid) && !updateInProgress.current && !hasUpdatedThisSession.current;

      if (needsUpdate) {
        updateInProgress.current = true;
        updateDoc(profileRef, {
          isOnline: true,
          lastActive: new Date().toISOString(),
          uid: user.uid
        }).then(async () => {
          hasUpdatedThisSession.current = true;
          updateInProgress.current = false;
          if (wasOffline && newProfile.role !== 'manager') {
            await addDoc(collection(db, 'notifications'), {
              userId: 'manager_broadcast',
              title: 'تسجيل دخول موظف',
              content: `قام الموظف ${newProfile.name} بتسجيل الدخول إلى النظام.`,
              timestamp: new Date().toISOString(),
              read: false,
              type: 'presence'
            }).catch(e => console.error("Error sending login notification:", e));
          }
        }).catch(err => {
          updateInProgress.current = false;
          hasUpdatedThisSession.current = true;
          if (err.code === 'resource-exhausted') setQuotaExceeded(true);
        });
      }
      
      setLoading(false);
      setIsAuthReady(true);
    }, (error) => {
      console.error("Profile sync error:", error);
      if (error.code === 'resource-exhausted') setQuotaExceeded(true);
      setLoading(false);
      setIsAuthReady(true);
    });

    profileUnsubRef.current = unsubProfile;
    return unsubProfile;
  };

  const resetQuota = () => {
    setQuotaExceeded(false);
    hasUpdatedThisSession.current = false;
    updateInProgress.current = false;
    // Re-trigger auth check if possible or just let components retry
  };

  const logout = async () => {
    const toastId = toast.loading('جاري تسجيل الخروج...');
    try {
      if (profile) {
        const profileRef = doc(db, 'users', profile.id);
        
        // Try to update status, but don't let it block sign out if it's slow or failing (quota)
        const updatePromise = updateDoc(profileRef, {
          isOnline: false,
          lastActive: new Date().toISOString()
        }).catch(err => console.error("Error updating online status during logout:", err));

        // Try to notify manager, but don't let it block sign out
        let notifyPromise: Promise<any> = Promise.resolve();
        if (profile.role !== 'manager') {
          notifyPromise = addDoc(collection(db, 'notifications'), {
            userId: 'manager_broadcast',
            title: 'تسجيل خروج موظف',
            content: `قام الموظف ${profile.name} بتسجيل الخروج من النظام.`,
            timestamp: new Date().toISOString(),
            read: false,
            type: 'presence'
          }).catch(err => console.error("Error adding logout notification:", err));
        }

        // Wait for a short time for the writes to at least be sent, but not forever
        await Promise.race([
          Promise.all([updatePromise, notifyPromise]),
          new Promise(resolve => setTimeout(resolve, 1000)) // 1 second timeout
        ]);
      }
      
      await signOut(auth);
      toast.success('تم تسجيل الخروج بنجاح', { id: toastId });
    } catch (err) {
      console.error("Error during logout:", err);
      // Fallback: always try to sign out
      try {
        await signOut(auth);
        toast.success('تم تسجيل الخروج', { id: toastId });
      } catch (signOutErr) {
        toast.error('حدث خطأ أثناء تسجيل الخروج', { id: toastId });
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // If it's the same user and we already have a profile, don't re-fetch
        if (user.uid === profile?.uid && !isInitialLoad.current) {
          return;
        }
        isInitialLoad.current = false;

        // DO NOT call setUser(user) here yet. 
        // We stay in loading state until profile is verified.
        setLoading(true);
        
        const fetchProfile = async (retryCount = 0) => {
          // Ensure user is still logged in and matches
          if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
            console.log("User changed or logged out during fetch, aborting");
            return;
          }

          try {
            // Add a small initial delay to allow Firestore to sync auth state
            if (retryCount === 0) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Re-check auth after delay
            if (!auth.currentUser) return;

            console.log(`Fetching profile for ${user.email} (attempt ${retryCount + 1})...`);
            const profileRef = doc(db, 'users', user.uid);
            
            // Use getDocFromServer to bypass cache and ensure we get the latest state
            let docSnap;
            try {
              docSnap = await getDocFromServer(profileRef);
            } catch (serverErr: any) {
              console.warn("getDocFromServer failed, trying getDoc (cache fallback):", serverErr);
              if (serverErr.code === 'unavailable' || serverErr.message?.includes('offline')) {
                // If offline, try to get from cache
                docSnap = await getDoc(profileRef);
              } else {
                throw serverErr;
              }
            }
            
            if (docSnap.exists()) {
              console.log("Profile found by UID, starting sync...");
              startProfileSync(user, user.uid, profileRef);
            } else {
              console.log("Profile not found by UID, searching by email in registered employees...");
              // Search for pre-registered user by email
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', user.email));
              
              // Use getDocsFromServer to ensure we check the real database for registration
              const querySnapshot = await getDocsFromServer(q);
              
              if (!querySnapshot.empty) {
                console.log("Pre-registered employee found, migrating to UID-based document...");
                const oldDocSnap = querySnapshot.docs[0];
                const oldData = oldDocSnap.data();
                
                // Create the new document with UID as ID
                const newProfileRef = doc(db, 'users', user.uid);
                await setDoc(newProfileRef, {
                  ...oldData,
                  uid: user.uid,
                  oldId: oldDocSnap.id,
                  isOnline: true,
                  lastActive: new Date().toISOString()
                });
                
                console.log("Migration complete, starting sync...");
                startProfileSync(user, user.uid, newProfileRef);
              } else {
                console.log("No registered employee found with this email. Checking bootstrap manager...");
                const isBootstrapManager = user.email === 'ammar.mouhamed.82@gmail.com' && user.emailVerified;
                
                if (isBootstrapManager) {
                  console.log("Bootstrap manager detected, creating initial profile...");
                  // Add a small delay for rules propagation
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  const initialProfile: Partial<UserProfile> = {
                    name: user.displayName || 'مدير النظام',
                    email: user.email!,
                    role: 'manager',
                    permissions: ['all'],
                    photoURL: user.photoURL || '',
                    isOnline: true,
                    lastActive: new Date().toISOString(),
                    uid: user.uid
                  };
                  await setDoc(doc(db, 'users', user.uid), initialProfile);
                  console.log("Bootstrap profile created successfully");
                  startProfileSync(user, user.uid, doc(db, 'users', user.uid));
                } else {
                  console.warn(`Access denied: ${user.email} is not registered in the employees table.`);
                  toast.error('عذراً، هذا البريد الإلكتروني غير مسجل في قائمة الموظفين المعتمدين. يرجى مراجعة مدير النظام لتسجيل حسابك أولاً.');
                  
                  // Sign out immediately to prevent unauthorized access to the app state
                  await signOut(auth);
                  setUser(null);
                  setProfile(null);
                  setLoading(false);
                  setIsAuthReady(true);
                }
              }
            }
          } catch (err: any) {
            console.error(`Error during initial profile check (attempt ${retryCount + 1}):`, err);
            
            // Retry on permission-denied or offline errors as it might be a sync or connection issue
            const isRetryable = err.code === 'permission-denied' || 
                               err.code === 'unavailable' || 
                               err.message?.includes('offline');

            if (isRetryable && retryCount < 3) {
              const delay = 1500 * (retryCount + 1);
              console.log(`Retryable error (${err.code || 'offline'}), retrying in ${delay}ms... (attempt ${retryCount + 2})`);
              setTimeout(() => fetchProfile(retryCount + 1), delay);
              return;
            }

            if (err.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
              } catch (e) {
                console.error("Permission denied details logged.");
              }
            }

            if (err.code === 'resource-exhausted') {
              setQuotaExceeded(true);
              const cached = localStorage.getItem(`cached_profile_${user.email}`);
              if (cached) {
                try {
                  const cachedProfile = JSON.parse(cached) as UserProfile;
                  setProfile(cachedProfile);
                  toast.info('تم تحميل البيانات من التخزين المؤقت بسبب تجاوز حصة الاستخدام.');
                } catch (parseErr) {
                  console.error("Error parsing cached profile:", parseErr);
                }
              } else {
                toast.error('عذراً، تم تجاوز حصة الاستخدام اليومية لقاعدة البيانات.');
              }
            } else if (err.code === 'permission-denied') {
              toast.error('خطأ في أذونات الوصول (Permission Denied). يرجى مراجعة مدير النظام.');
            } else {
              toast.error('حدث خطأ أثناء تحميل بيانات الحساب: ' + (err.message || 'خطأ غير معروف'));
            }
            
            setLoading(false);
            setIsAuthReady(true);
          }
        };

        // Add a delay for Firestore initialization to avoid "client is offline" errors
        setTimeout(() => fetchProfile(), 1000);
      } else {
        console.log("Cleaning up user state...");
        setUser(null);
        setProfile(null);
        if (profileUnsubRef.current) {
          profileUnsubRef.current();
          profileUnsubRef.current = null;
        }
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthReady, quotaExceeded, resetQuota, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
