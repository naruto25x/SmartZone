import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "../../components/BottomNav";
import { auth, db } from "../../FirebaseConfig";

export default function StudentAlerts() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Fetch alerts first, then sort locally to avoid composite index requirement
      const q = query(
        collection(db, "alerts"), 
        where("student_uid", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Manual sort by timestamp (descending)
      list.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      setAlerts(list);
    } catch (err) {
      console.error("Fetch alerts error:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAlerts().then(() => setRefreshing(false));
  }, []);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Alerts</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
              </View>
              <Text style={styles.alertDesc}>{alert.description || alert.desc}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent alerts.</Text>
        )}

        <TouchableOpacity style={styles.sosButton}>
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav activeTab="Alerts" userType="Student" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#4CAF50", height: 80, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 20 },
  alertCard: { backgroundColor: "#fff", borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderLeftWidth: 5, borderLeftColor: "#4CAF50" },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  alertTitle: { fontSize: 16, fontWeight: "bold" },
  alertTime: { fontSize: 12, color: "#888" },
  alertDesc: { fontSize: 14, color: "#666" },
  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },
  sosButton: { backgroundColor: "#FF5252", height: 100, width: 100, borderRadius: 50, alignSelf: "center", justifyContent: "center", alignItems: "center", marginTop: 40 },
  sosText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});
