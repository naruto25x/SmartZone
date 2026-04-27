import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "../FirebaseConfig";

export default function Page7() {
    const router = useRouter();
    const [firstName, setFirstName] = useState("");
    const [userType, setUserType] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUserData = async () => {
        const user = auth.currentUser;
        if (user) {
            if (user.displayName) {
                setFirstName(user.displayName.split(" ")[0]);
            } else if (user.email) {
                const namePart = user.email.split("@")[0];
                setFirstName(namePart.charAt(0).toUpperCase() + namePart.slice(1));
            } else {
                setFirstName("User");
            }

            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    setUserType(userSnap.data().userType);
                }
            } catch (err) {
                console.error("Page7 fetch error:", err);
            }
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchUserData().then(() => setRefreshing(false));
    }, []);

    const handleContinue = () => {
        router.replace("./DashboardPage");
    };

    return (
        <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2e7d32"]} />
            }
        >
            <View style={styles.container}>
                <View style={styles.inner}>
                    <MaterialIcons name="security" size={70} color="#2e7d32" />
                    <Text style={styles.hello}>Hello, {firstName}</Text>
                    <Text style={styles.welcome}>Welcome to {userType === 'Guardian' ? 'Guardian Portal' : 'Safety App'}</Text>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleContinue}
                >
                    <Text style={styles.buttonText}>Continue →</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1 },
    container: { flex: 1, backgroundColor: "#c8f0c8", justifyContent: "space-between", alignItems: "center", paddingVertical: 80, paddingHorizontal: 20 },
    inner: { flex: 1, justifyContent: "center", alignItems: "center" },
    hello: { fontSize: 26, fontWeight: "bold", color: "#000", marginTop: 20 },
    welcome: { fontSize: 16, color: "#333", marginTop: 8 },
    button: { backgroundColor: "#fff", paddingVertical: 16, paddingHorizontal: 60, borderRadius: 12, marginBottom: 20 },
    buttonText: { fontSize: 18, color: "#2e7d32", fontWeight: "600" },
});