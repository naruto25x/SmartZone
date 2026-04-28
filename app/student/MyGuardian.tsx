import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { auth, db } from "../../FirebaseConfig";

export default function MyGuardianScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchGuardianData();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  useEffect(() => {
    fetchGuardianData();
  }, []);

  const fetchGuardianData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      // 1. Fetch Accepted Guardians
      const qAccepted = query(
        collection(db, "guardian_requests"), 
        where("student_uid", "==", user.uid),
        where("status", "==", "accepted")
      );
      const snapAccepted = await getDocs(qAccepted);
      setGuardians(snapAccepted.docs.map(d => ({ id: d.id, ...d.data() })));

      // 2. Fetch Pending Requests
      const qPending = query(
        collection(db, "guardian_requests"), 
        where("student_uid", "==", user.uid),
        where("status", "==", "pending")
      );
      const snapPending = await getDocs(qPending);
      setPendingRequests(snapPending.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Fetch guardian data error:", e);
    }
  };

  const handleRemoveGuardian = async (requestId: string, guardianName: string) => {
    Alert.alert(
      "Remove Guardian",
      `Are you sure you want to remove ${guardianName}? This will delete the connection.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "guardian_requests", requestId));
              Alert.alert("Removed", "Guardian removed successfully.");
              fetchGuardianData();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to remove guardian.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Guardians</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {/* Search Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.searchCard} 
            onPress={() => router.push("/student/SearchPeople")}
          >
            <View style={styles.searchIconContainer}>
              <MaterialIcons name="person-add" size={28} color="#4CAF50" />
            </View>
            <View style={styles.searchTextContainer}>
              <Text style={styles.searchTitle}>Add New Guardian</Text>
              <Text style={styles.searchSub}>Search by phone number</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Accepted Guardians Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Active Guardians ({guardians.length})</Text>
          {guardians.length > 0 ? (
            guardians.map((guardian) => (
              <View key={guardian.id} style={styles.guardianItem}>
                <View style={styles.avatar}>
                  <MaterialIcons name="person" size={24} color="#4CAF50" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{guardian.guardian_name}</Text>
                  <Text style={styles.relation}>{guardian.relationship}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleRemoveGuardian(guardian.id, guardian.guardian_name)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="people-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No active guardians yet.</Text>
            </View>
          )}
        </View>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: "#F57C00" }]}>Sent Requests (Pending)</Text>
            {pendingRequests.map((req) => (
              <View key={req.id} style={[styles.guardianItem, styles.pendingItem]}>
                <View style={[styles.avatar, { backgroundColor: "#FFF3E0" }]}>
                  <MaterialIcons name="hourglass-empty" size={20} color="#F57C00" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{req.guardian_name}</Text>
                  <Text style={styles.relation}>{req.relationship}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: "#FFF3E0" }]}>
                  <Text style={[styles.statusText, { color: "#F57C00" }]}>Waiting...</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomNav activeTab="Home" userType="Student" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { backgroundColor: "#4CAF50", height: 80, justifyContent: "center", alignItems: "center", elevation: 4 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  container: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHeader: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 12, marginLeft: 4 },
  searchCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  searchIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginRight: 16 },
  searchTextContainer: { flex: 1 },
  searchTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  searchSub: { fontSize: 13, color: "#777", marginTop: 2 },
  guardianItem: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#eee" },
  pendingItem: { borderColor: "#FFE0B2", backgroundColor: "#FFFBFA" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center", marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "bold", color: "#333" },
  relation: { fontSize: 13, color: "#666", marginTop: 2 },
  removeButton: { backgroundColor: '#FFF5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FFE3E3' },
  removeButtonText: { color: '#FF5252', fontSize: 12, fontWeight: '600' },
  statusBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "bold", color: "#4CAF50" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 12, padding: 30, alignItems: "center", justifyContent: "center", borderStyle: "dashed", borderWidth: 1, borderColor: "#ccc" },
  emptyText: { color: "#999", marginTop: 10, fontSize: 14 },
});
