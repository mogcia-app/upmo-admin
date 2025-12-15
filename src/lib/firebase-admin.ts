import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// 環境変数からAdmin SDKキーを取得
const getAdminConfig = () => {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY;
  
  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_ADMIN_SDK_KEY environment variable is not set. " +
      "Please add it to your .env.local file."
    );
  }

  try {
    // JSON文字列をパース
    const serviceAccount = JSON.parse(serviceAccountKey);
    return {
      credential: cert(serviceAccount),
    };
  } catch (error) {
    throw new Error(
      "Failed to parse FIREBASE_ADMIN_SDK_KEY. " +
      "Make sure it's a valid JSON string."
    );
  }
};

// Firebase Adminが既に初期化されているかチェック
let adminApp: App;
if (getApps().length === 0) {
  adminApp = initializeApp(getAdminConfig());
} else {
  adminApp = getApps()[0];
}

// AuthenticationとFirestoreをエクスポート
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
export default adminApp;

