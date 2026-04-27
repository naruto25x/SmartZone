import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "../FirebaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Load saved credentials on mount
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("saved_email");
        const savedPassword = await AsyncStorage.getItem("saved_password");
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
      } catch (e) {
        console.error("Failed to load credentials");
      }
    };
    loadCredentials();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleSignIn = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      alert("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
      const user = userCredential.user;
      
      if (!user.emailVerified) {
        // Automatically delete the account if it's not verified 
        // to allow the user to register again with the same email
        try {
          await user.delete();
          alert("Your email was not verified. The unverified account has been removed. Please sign up again and verify your email immediately.");
        } catch (deleteError) {
          console.error("Cleanup error:", deleteError);
          alert("Your email is not verified. Please check your inbox.");
        }
        setIsSubmitting(false);
        return;
      }

      // 1. Sync check: Ensure Firestore data exists and is clean
      try {
        const { deleteDoc, doc, getDoc } = require("firebase/firestore");
        const { db } = require("../FirebaseConfig");
        const userSnap = await getDoc(doc(db, "users", user.uid));
        
        if (!userSnap.exists()) {
          // If Firestore record is missing (deleted from admin/backend), 
          // delete the Auth account to stay in sync
          await user.delete();
          alert("This account has been deactivated. Please contact support.");
          setIsSubmitting(false);
          return;
        }
      } catch (syncError) {
        console.error("Auth-Firestore sync error:", syncError);
      }

      // Save credentials if rememberMe is enabled
      if (rememberMe) {
        if (normalizedEmail) await AsyncStorage.setItem("saved_email", normalizedEmail);
        if (normalizedPassword) await AsyncStorage.setItem("saved_password", normalizedPassword);
      } else {
        await AsyncStorage.removeItem("saved_email");
        await AsyncStorage.removeItem("saved_password");
      }
      
      // Auto redirect to page7 and then it handles navigation based on role
      router.push("./page7");
    } catch (error: any) {
      alert(error.message || "Invalid credentials!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    alert("Password reset is coming soon. Please contact support.");
  };

  const handleGoogleSignIn = () => {
    alert("Google sign-in is not configured in demo mode.");
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2e7d32"]} />
      }
    >
      <View style={styles.container}>
        <MaterialIcons name="security" size={64} color="#2e7d32" />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your SafeZone account</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter email"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          value={email}
          onChangeText={setEmail}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter password"
            placeholderTextColor="#666"
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
            <MaterialIcons
              name={passwordVisible ? "visibility" : "visibility-off"}
              size={24}
              color="#555"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.rememberMeContainer} 
          onPress={() => setRememberMe(!rememberMe)}
        >
          <MaterialIcons 
            name={rememberMe ? "check-box" : "check-box-outline-blank"} 
            size={24} 
            color="#2e7d32" 
          />
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signInButton, isSubmitting && styles.signInButtonDisabled]}
          onPress={handleSignIn}
          disabled={isSubmitting}
        >
          <Text style={styles.signInText}>{isSubmitting ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <AntDesign name="google" size={20} color="red" />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.signupText}>
          {"Don\'t have an account? "}
          <Text style={styles.signupLink} onPress={() => router.push("/signup")}>
            Sign Up
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },
  title: { fontSize: 28, fontWeight: "bold", marginTop: 10, color: "#000" },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 20 },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, marginBottom: 15, width: "100%" },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  rememberMeContainer: { flexDirection: "row", alignItems: "center", width: "100%", marginBottom: 20 },
  rememberMeText: { marginLeft: 8, color: "#555", fontSize: 14 },
  signInButton: { backgroundColor: "#2e7d32", width: "100%", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  signInText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  forgotPassword: { color: "#2e7d32", marginBottom: 20 },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: 10, width: "100%" },
  divider: { flex: 1, height: 1, backgroundColor: "#ccc" },
  orText: { marginHorizontal: 10, color: "#555", fontWeight: "bold" },
  googleButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, width: "100%", justifyContent: "center", marginBottom: 20 },
  googleText: { marginLeft: 8, fontSize: 16, color: "#000" },
  signInButtonDisabled: { opacity: 0.6 },
  signupText: { fontSize: 14, color: "#555" },
  signupLink: { color: "#2e7d32", fontWeight: "bold" },
});