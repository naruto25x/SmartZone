import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBw9MHCI0YyYUTjv5boOhFO9xz9FMZh5vA",
  authDomain: "zone-c6fbe.firebaseapp.com",
  projectId: "zone-c6fbe",
  storageBucket: "zone-c6fbe.firebasestorage.app",
  messagingSenderId: "335045241674",
  appId: "1:335045241674:web:173c10a317b7e238caafb3",
  measurementId: "G-XP2V1KRPZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
