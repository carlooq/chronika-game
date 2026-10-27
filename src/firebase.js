import { firebaseConfig } from './firebase-config.js';

// Public Firebase Web SDK; these values identify a Firebase project, they are
// NOT an API secret. Authorization comes from Firestore Security Rules.
export async function connectFirebase(){
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId || !firebaseConfig?.appId) return null;
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'),
  ]);
  const app=appSdk.initializeApp(firebaseConfig);
  const auth=authSdk.getAuth(app);
  const credential=await authSdk.signInAnonymously(auth);
  const db=dbSdk.getFirestore(app);
  const ref=dbSdk.doc(db,'chronikaProgress',credential.user.uid);
  return {
    uid:credential.user.uid,
    async load(){const snapshot=await dbSdk.getDoc(ref);return snapshot.exists()?snapshot.data():null;},
    async save(progress){await dbSdk.setDoc(ref,{
      stages:progress.stages||{},xp:Math.floor(progress.xp||0),
      totalStars:Object.values(progress.stages||{}).reduce((sum,x)=>sum+Number(x.stars||0),0),
      lastUpdated:Date.now(),
    });},
  };
}
