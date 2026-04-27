import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNav from "../../components/BottomNav";
import { auth, db } from "../../FirebaseConfig";

export default function GuardianHome() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [guardianName, setGuardianName] = useState("");
  const [students, setStudents] = useState<any[]>([]);

  const fetchGuardianData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setGuardianName(userData.name?.split(" ")[0] || "Guardian");
        const mobile = userData.mobile;
        
        if (mobile) {
          // Fetch Pending Requests Count
          const qPending = query(
            collection(db, "guardian_requests"), 
            where("guardian_phone", "==", mobile),
            where("status", "==", "pending")
          );
          const pendingSnap = await getDocs(qPending);
          setPendingRequests(pendingSnap.size);

          // Fetch Connected Students
          const qAccepted = query(
            collection(db, "guardian_requests"),
            where("guardian_phone", "==", mobile),
            where("status", "==", "accepted")
          );
          const acceptedSnap = await getDocs(qAccepted);
          
          const studentsList = await Promise.all(acceptedSnap.docs.map(async (d) => {
            const data = d.data();
            // Fetch student's current location and active safe zone status
            let isSafe = true; 
            let hasActiveZone = false;
            let statusText = "Not Active";

            try {
              if (data.student_id) {
                // 1. Get student's current location from users collection
                const studentSnap = await getDoc(doc(db, "users", data.student_id));
                const studentData = studentSnap.data();
                const currentLat = studentData?.latitude;
                const currentLng = studentData?.longitude;

                // 2. Fetch student's active safe zone
                const zoneQuery = query(
                  collection(db, "safe_zones"),
                  where("userId", "==", data.student_id),
                  where("isActive", "==", true)
                );
                const zoneSnap = await getDocs(zoneQuery);
                
                if (!zoneSnap.empty) {
                  hasActiveZone = true;
                  const activeZone = zoneSnap.docs[0].data();
                  
                  // 3. Calculate if student is within the radius
                  if (currentLat && currentLng) {
                    const distance = getDistance(
                      currentLat, currentLng, 
                      activeZone.latitude, activeZone.longitude
                    );
                    isSafe = distance <= activeZone.radius;
                    statusText = isSafe ? "Safe" : "Unsafe";
                  } else {
                    // If location unknown but zone active, we can't be sure, 
                    // but let's default to Safe if we have no evidence of Unsafe
                    statusText = "Safe";
                  }
                } else {
                  hasActiveZone = false;
                  statusText = "Not Active";
                }
              }
            } catch (e) {
              console.log("Error checking student status:", e);
            }
            
            return { id: d.id, ...data, isSafe, hasActiveZone, statusText };
          }));

          setStudents(studentsList);
        }
      }
    } catch (err) {
      console.error("Guardian Home fetch error:", err);
    }
  };

  // Helper function to calculate distance in meters between two points
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  useEffect(() => {
    fetchGuardianData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchGuardianData().then(() => setRefreshing(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, {guardianName}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Connected Children</Text>
        </View>
        
        {students.length > 0 ? (
          students.map((student) => (
            <View key={student.id} style={styles.studentCardFull}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatarLarge}>
                  <MaterialIcons name="person" size={40} color="#4CAF50" />
                </View>
                <View style={styles.studentInfoFull}>
                  <Text style={styles.studentNameFull}>{student.student_name}</Text>
                  <Text style={styles.studentIdFull}>{student.student_name}</Text>
                </View>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: student.statusText === "Safe" ? "#4CAF50" : (student.statusText === "Unsafe" ? "#FF5252" : "#9E9E9E") }
                ]}>
                  <Text style={styles.statusBadgeText}>{student.statusText}</Text>
                  <MaterialIcons name="keyboard-arrow-down" size={16} color="#fff" />
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.liveMapBtn}
                onPress={() => router.push({
                  pathname: "/guardian/LiveTracking",
                  params: { studentId: student.student_id, studentName: student.student_name }
                })}
              >
                <Text style={styles.liveMapBtnText}>View Live Map</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No students connected yet</Text>
          </View>
        )}
      </ScrollView>

      <BottomNav activeTab="Home" userType="Guardian" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { backgroundColor: "#4CAF50", height: 100, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 30 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  notificationBtn: { position: "relative" },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#FF5252", position: "absolute", top: -5, right: -5, borderWidth: 1.5, borderColor: "#4CAF50", justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  scrollContent: { padding: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  viewAllText: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  studentCardFull: { 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 20, 
    elevation: 4, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatarLarge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center' },
  studentInfoFull: { flex: 1, marginLeft: 15 },
  studentNameFull: { fontSize: 18, fontWeight: "bold", color: "#333" },
  studentIdFull: { fontSize: 14, color: "#999", marginTop: 2 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center'
  },
  statusBadgeText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginRight: 4 },
  liveMapBtn: { 
    backgroundColor: '#A5D6A7', 
    paddingVertical: 10, 
    borderRadius: 20, 
    alignItems: 'center',
    marginTop: 5
  },
  liveMapBtnText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 40, backgroundColor: "#f9f9f9", padding: 30, borderRadius: 15, borderStyle: "dashed", borderWidth: 1, borderColor: "#ccc" },
  emptyText: { marginTop: 10, color: "#999", fontSize: 15 },
});
