// SignUpScreen.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../FirebaseConfig";

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [userType, setUserType] = useState("Student");
  const [gender, setGender] = useState("Male");
  const [agreed, setAgreed] = useState(false);   // <-- checkbox state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleCreateAccount = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !mobile.trim() || !password.trim()) {
      alert("Please fill all fields before creating an account.");
      return;
    }

    if (!email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    if (mobile.trim().length < 10) {
      alert("Please enter a valid phone number.");
      return;
    }

    if (!agreed) {
      alert("You must agree to the terms to continue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;

      const trimmedFirstName = firstName.trim();
      const fullName = `${trimmedFirstName} ${lastName.trim()}`;

      // Update Firebase Profile with display name
      const { updateProfile } = require("firebase/auth");
      await updateProfile(user, { displayName: fullName });

      // 1. Send Verification Email immediately
      try {
        await sendEmailVerification(user);
      } catch (mailError) {
        console.error("Email verification error:", mailError);
      }

      // Cleanup mechanism: If user doesn't verify within a time limit, 
      // they should be purged. Note: Real cleanup happens in Login sync check.

      // 2. Save user info to MySQL & Firebase Firestore in background
      const userData = {
        uid: user.uid,
        name: fullName,
        email: email.trim(),
        mobile: mobile.trim(),
        userType: userType,
        gender: gender,
      };

      // Save to Firebase Firestore
      setDoc(doc(db, "users", user.uid), userData).catch(err => console.error("Firebase Firestore save error:", err));

      // Save to MySQL
      fetch("http://192.168.0.107:5000/api/users", { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }).catch(err => console.error("Background MySQL save error:", err));

      alert("Verification email sent! Please check your inbox (and SPAM folder) and verify your email before logging in.");
      setIsSubmitting(false);
      router.push("/login");
    } catch (error: any) {
      alert(error.message || "Failed to create account.");
      setIsSubmitting(false);
    }
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SafeZone for better safety</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First Name"
            placeholderTextColor="#666"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last Name"
            placeholderTextColor="#666"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

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

        <TextInput
          style={styles.input}
          placeholder="Enter phone number"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={mobile}
          onChangeText={setMobile}
        />

        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          {["Student", "Guardian"].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.userTypeButton,
                userType === type && styles.userTypeSelected
              ]}
              onPress={() => setUserType(type)}
            >
              <Text style={styles.userTypeText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gender Selection */}
        <Text style={styles.label}>Select Gender</Text>
        <View style={styles.userTypeContainer}>
          {["Male", "Female", "Other"].map(item => (
            <TouchableOpacity
              key={item}
              style={[
                styles.userTypeButton,
                gender === item && styles.userTypeSelected
              ]}
              onPress={() => setGender(item)}
            >
              <Text style={styles.userTypeText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms Checkbox */}
        <TouchableOpacity 
          style={styles.checkboxContainer} 
          onPress={() => setAgreed(!agreed)}
        >
          <MaterialIcons 
            name={agreed ? "check-box" : "check-box-outline-blank"} 
            size={20} 
            color={agreed ? "#2e7d32" : "#555"} 
          />
          <Text style={styles.checkboxText}>
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </TouchableOpacity>

        {/* Create Account Button */}
        <TouchableOpacity 
          style={[styles.signInButton, (!agreed || isSubmitting) && { opacity: 0.5 }]} 
          disabled={!agreed || isSubmitting}
          onPress={handleCreateAccount}
        >
          <Text style={styles.signInText}>
            {isSubmitting ? "Creating an account..." : "Create Account"}
          </Text>
        </TouchableOpacity>

        {/* Navigate back to Login */}
        <Text style={styles.signupText}>
          Already have an account?{" "}
          <Text style={styles.signupLink} onPress={() => router.push("/login")}>
            Sign In
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 40 },
  label: { width: '100%', fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 10 },
  title: { fontSize: 28, fontWeight: "bold", marginTop: 10, color: "#000" },
  subtitle: { fontSize: 14, color: "#555", marginBottom: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
  halfInput: { width: "48.5%" },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 8, paddingHorizontal: 12, marginBottom: 15, width: "100%" },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  signInButton: { backgroundColor: "#2e7d32", width: "100%", padding: 15, borderRadius: 8, alignItems: "center", marginBottom: 10 },
  signInText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  userTypeContainer: { flexDirection: "row", marginBottom: 15 },
  userTypeButton: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginHorizontal: 5 },
  userTypeSelected: { backgroundColor: "#2e7d32" },
  userTypeText: { color: "#000" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  checkboxText: { marginLeft: 8, color: "#555" },
  signupText: { fontSize: 14, color: "#555" },
  signupLink: { color: "#2e7d32", fontWeight: "bold" },
});
