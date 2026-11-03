export function firebaseConfiguration(env = import.meta.env) {
  return {
    apiKey: env?.VITE_FIREBASE_API_KEY ?? "",
    authDomain: env?.VITE_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env?.VITE_FIREBASE_PROJECT_ID ?? "",
    appId: env?.VITE_FIREBASE_APP_ID ?? "",
  };
}

export function sharedModelsConfigured(env = import.meta.env) {
  return Object.values(firebaseConfiguration(env)).every((value) => typeof value === "string" && value.trim());
}

export function firebaseAccountService(auth, sdk, getOrigin) {
  return {
    userId: () => auth.currentUser?.uid,
    isVerified: () => Boolean(auth.currentUser?.emailVerified),
    onAuthChanged: (callback, onError) => sdk.onAuthStateChanged(auth, callback, onError),
    async refreshUser() {
      const user = auth.currentUser;
      if (!user) return null;
      await sdk.reload(user);
      // Verification changes the token claim enforced by Firestore rules.
      await sdk.getIdToken(user, true);
      return user;
    },
    signIn: (email, password) => sdk.signInWithEmailAndPassword(auth, email.trim(), password),
    signOut: () => sdk.signOut(auth),
    async register(email, password) {
      const result = await sdk.createUserWithEmailAndPassword(auth, email.trim(), password);
      await sdk.sendEmailVerification(result.user, { url: getOrigin() });
    },
    resendVerification() {
      if (!auth.currentUser) throw new Error("Sign in before requesting a verification email.");
      return sdk.sendEmailVerification(auth.currentUser, { url: getOrigin() });
    },
  };
}

let clientPromise;
export async function getSharedModelsClient() {
  if (!sharedModelsConfigured()) throw new Error("Shared models are not connected. Ask the administrator to configure Firebase.");
  if (!clientPromise) clientPromise = Promise.all([import("firebase/app"), import("firebase/auth"), import("firebase/firestore/lite")]).then(([appSdk, authSdk, firestore]) => {
    const app = appSdk.getApps().find((entry) => entry.name === "quoteflow") ?? appSdk.initializeApp(firebaseConfiguration(), "quoteflow");
    const auth = authSdk.getAuth(app);
    const db = firestore.getFirestore(app);
    return { db, firestore, ...firebaseAccountService(auth, authSdk, () => window.location.origin) };
  }).catch((error) => { clientPromise = null; throw error; });
  return clientPromise;
}
