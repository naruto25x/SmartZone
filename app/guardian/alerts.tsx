import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../../components/BottomNav";
import { auth, db } from "../../FirebaseConfig";

export default function GuardianAlerts() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchGuardianData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const mobile = userSnap.data().mobile;
        if (mobile) {
          // 1. Fetch Pending Requests
          const qReqs = query(
            collection(db, "guardian_requests"), 
            where("guardian_phone", "==", mobile),
            where("status", "==", "pending")
          );
          const reqSnap = await getDocs(qReqs);
          setRequests(reqSnap.docs.map(d => ({ id: d.id, ...d.data(), type: 'request' })));

          // 2. Get connected students for actual alerts
          const qStudents = query(
            collection(db, "guardian_requests"), 
            where("guardian_phone", "==", mobile),
            where("status", "==", "accepted")
          );
          const studentSnap = await getDocs(qStudents);
          const studentIds = studentSnap.docs.map(d => d.data().student_uid);

          if (studentIds.length > 0) {
            const qAlerts = query(
              collection(db, "alerts"),
              where("student_uid", "in", studentIds.slice(0, 10))
            );
            const alertSnap = await getDocs(qAlerts);
            const list = alertSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'alert' }));
            list.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setAlerts(list);
          } else {
            setAlerts([]);
          }
        }
      }
    } catch (err) {
      console.error("Fetch guardian alerts error:", err);
    }
  };

  const handleRequestAction = async (requestId: string, studentName: string, action: 'accepted' | 'rejected') => {
    try {
      if (action === 'rejected') {
        await deleteDoc(doc(db, "guardian_requests", requestId));
        Alert.alert("Cancellation", `You have cancelled the request from ${studentName}.`);
      } else {
        await updateDoc(doc(db, "guardian_requests", requestId), { status: 'accepted' });
        Alert.alert("Connection Successful", `You and ${studentName} are now connected.`);
      }
      fetchGuardianData();
    } catch (err) {
      Alert.alert("Error", "Action failed. Please try again.");
    }
  };

  useEffect(() => {
    fetchGuardianData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchGuardianData().then(() => setRefreshing(false));
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
        <Text style={styles.headerTitle}>Notifications & Alerts</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {/* Pending Requests Section (Interactive) */}
        {requests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New Connection Requests</Text>
            {requests.map((req) => (
              <View key={req.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <Text style={styles.studentName}>{req.student_name}</Text>
                  <Text style={styles.requestText}>wants to connect with you</Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn]} 
                    onPress={() => handleRequestAction(req.id, req.student_name, 'accepted')}
                  >
                    <Text style={styles.actionBtnText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => handleRequestAction(req.id, req.student_name, 'rejected')}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Regular Alerts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Alerts</Text>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={[styles.alertTitle, alert.type === 'emergency' && styles.emergencyText]}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
                </View>
                <Text style={styles.alertDesc}>{alert.description || alert.desc}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No recent alerts from your students.</Text>
          )}
        </View>
      </ScrollView>

      <BottomNav activeTab="Alerts" userType="Guardian" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#4CAF50", height: 80, justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 15 },
  requestCard: { backgroundColor: "#f0f7ff", borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: "#cce5ff" },
  requestInfo: { marginBottom: 12 },
  studentName: { fontSize: 17, fontWeight: "bold", color: "#004085" },
  requestText: { fontSize: 14, color: "#666", marginTop: 2 },
  actionRow: { flexDirection: "row", justifyContent: "flex-end" },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 6, marginLeft: 10 },
  acceptBtn: { backgroundColor: "#4CAF50" },
  rejectBtn: { backgroundColor: "#FF5252" },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  alertCard: { backgroundColor: "#fff", borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderLeftWidth: 5, borderLeftColor: "#4CAF50" },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  alertTitle: { fontSize: 16, fontWeight: "bold" },
  emergencyText: { color: "#FF5252" },
  alertTime: { fontSize: 12, color: "#888" },
  alertDesc: { fontSize: 14, color: "#666" },
  emptyText: { textAlign: "center", marginTop: 20, color: "#999" },
});
