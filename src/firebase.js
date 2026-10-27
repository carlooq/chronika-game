import { firebaseConfig } from './firebase-config.js';
import { applyRunStats, normaliseStats } from './playerStats.js';
import { createAdminDb } from './adminDb.js';

// CHRONIKA has its own Firebase project. SDK web configuration is public.
export async function connectFirebase() {
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) {
    throw new Error('Brak konfiguracji Firebase dla CHRONIKI.');
  }
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'),
  ]);
  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  const db = dbSdk.getFirestore(app);

  // Wait for Firebase to restore a registered account or existing guest session.
  await auth.authStateReady();
  if (!auth.currentUser) await authSdk.signInAnonymously(auth);

  const progressRef = uid => dbSdk.doc(db, 'chronikaProgress', uid);
  const statsRef = uid => dbSdk.doc(db, 'chronikaStats', uid);
  const profileRef = uid => dbSdk.doc(db, 'chronikaProfiles', uid);
  const requireUser = () => {
    if (!auth.currentUser) throw new Error('Brak aktywnej sesji.');
    return auth.currentUser;
  };

  return {
    admin:createAdminDb(dbSdk,db,auth),
    currentSession() {
      const user = auth.currentUser;
      return user ? { uid:user.uid, anonymous:user.isAnonymous, email:user.email || '', name:user.displayName || '' } : null;
    },
    observe(listener) {
      return authSdk.onAuthStateChanged(auth, () => listener(this.currentSession()));
    },
    async loadProgress(uid) {
      const snap = await dbSdk.getDoc(progressRef(uid));
      return snap.exists() ? snap.data() : null;
    },
    async saveProgress(uid, progress) {
      if (requireUser().uid !== uid) throw new Error('Nieprawidłowy użytkownik.');
      await dbSdk.setDoc(progressRef(uid), {
        stages:progress.stages || {},
        xp:Math.max(0, Math.floor(progress.xp || 0)),
        totalStars:Object.values(progress.stages || {}).reduce((n,x)=>n + Number(x.stars || 0),0),
        lastUpdated:Date.now(),
      });
    },
    async loadStats(uid) {
      const snap = await dbSdk.getDoc(statsRef(uid));
      return snap.exists() ? normaliseStats(snap.data()) : normaliseStats();
    },
    async recordRun(uid, run) {
      if (requireUser().uid !== uid) throw new Error('Nieprawidłowy użytkownik.');
      return dbSdk.runTransaction(db, async transaction => {
        const ref = statsRef(uid);
        const snap = await transaction.get(ref);
        const next = applyRunStats(snap.exists() ? snap.data() : null, run);
        transaction.set(ref, next);
        return next;
      });
    },
    async loadProfile(uid) {
      const snap = await dbSdk.getDoc(profileRef(uid));
      return snap.exists() ? snap.data() : null;
    },
    async register(email, password, nickname) {
      const displayName = String(nickname || '').trim().slice(0,24);
      if (displayName.length < 2) throw new Error('Nick musi mieć co najmniej 2 znaki.');
      const current = requireUser();
      if (!current.isAnonymous) throw new Error('Jesteś już zalogowany.');
      // Linking upgrades the current anonymous account IN PLACE, retaining its
      // UID and all saved campaign progress. Do not create a new UID here.
      const credential = authSdk.EmailAuthProvider.credential(email, password);
      const linked = await authSdk.linkWithCredential(current, credential);
      await authSdk.updateProfile(linked.user, { displayName });
      await dbSdk.setDoc(profileRef(linked.user.uid), {
        displayName, createdAt:Date.now(), updatedAt:Date.now(),
      }, { merge:true });
      return linked.user;
    },
    async login(email, password) {
      return (await authSdk.signInWithEmailAndPassword(auth, email, password)).user;
    },
    async logout() {
      await authSdk.signOut(auth);
      // Allow playing as a fresh guest after leaving an existing account.
      await authSdk.signInAnonymously(auth);
    },
    async resetPassword(email) { await authSdk.sendPasswordResetEmail(auth, email); },
    async rename(nickname) {
      const name = String(nickname || '').trim().slice(0,24);
      if (name.length < 2) throw new Error('Nick musi mieć co najmniej 2 znaki.');
      const user = requireUser();
      if (user.isAnonymous) throw new Error('Najpierw utwórz konto.');
      await authSdk.updateProfile(user, { displayName:name });
      await dbSdk.setDoc(profileRef(user.uid), { displayName:name, updatedAt:Date.now() }, { merge:true });
      return name;
    },
  };
}

export function friendlyAuthError(error) {
  const code = String(error?.code || '');
  if (code.includes('email-already-in-use')) return 'Ten e-mail jest już zajęty. Zaloguj się na istniejące konto.';
  if (code.includes('invalid-email')) return 'Wpisz poprawny adres e-mail.';
  if (code.includes('weak-password')) return 'Hasło musi mieć przynajmniej 6 znaków.';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Nieprawidłowy e-mail lub hasło.';
  if (code.includes('too-many-requests')) return 'Zbyt wiele prób. Spróbuj później.';
  if (code.includes('network-request-failed')) return 'Problem z połączeniem. Spróbuj ponownie.';
  if (code.includes('credential-already-in-use')) return 'To konto już istnieje. Zaloguj się.';
  if (code.includes('operation-not-allowed')) return 'Metoda logowania nie jest włączona w Firebase Authentication.';
  if (code.includes('requires-recent-login')) return 'Zaloguj się ponownie, aby zmienić ustawienia.';
  return error?.message || 'Nie udało się wykonać operacji.';
}
