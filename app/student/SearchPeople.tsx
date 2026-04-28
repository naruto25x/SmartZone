import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../FirebaseConfig";

export default function SearchPeopleScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchMyRequests();
    // fetchAllUsersForSuggestions(); // Removed: Suggestions no longer shown on load
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchMyRequests().then(() => setRefreshing(false));
  }, []);

  const fetchMyRequests = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const q = query(collection(db, "guardian_requests"), where("student_uid", "==", user.uid));
      const snap = await getDocs(q);
      const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyRequests(reqs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 5) {
      Alert.alert("Error", "Please enter a valid phone number or name.");
      return;
    }

    setIsSearching(true);
    try {
      // Clean the search query
      const cleanSearch = searchQuery.trim();
      
      // Search by Mobile (Exact match)
      const q = query(
        collection(db, "users"), 
        where("mobile", "==", cleanSearch),
        where("userType", "==", "Guardian")
      );
      
      const querySnapshot = await getDocs(q);
      let foundUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If no exact mobile match, try searching by Name but still filter by Guardian role
      if (foundUsers.length === 0) {
        const qName = query(
          collection(db, "users"),
          where("name", "==", cleanSearch),
          where("userType", "==", "Guardian")
        );
        const nameSnapshot = await getDocs(qName);
        foundUsers = nameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
      
      // Filter out current user and ONLY show Guardians
      const finalResults = foundUsers.filter((u: any) => 
        u.uid !== auth.currentUser?.uid && 
        u.userType === "Guardian"
      );
      
      setUsers(finalResults);
      if (finalResults.length === 0) {
        Alert.alert("No Results", "No user found with this number or name exactly.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const getStatus = (targetUid: string) => {
    const req = myRequests.find(r => r.target_uid === targetUid || r.guardian_phone === users.find(u => u.uid === targetUid)?.mobile);
    if (!req) return "none";
    return req.status; // 'pending', 'accepted'
  };

  const sendRequest = async (targetUser: any) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const requestData = {
        student_uid: user.uid,
        student_name: user.displayName || "Unknown",
        guardian_name: targetUser.name,
        guardian_phone: targetUser.mobile,
        target_uid: targetUser.uid,
        relationship: "Guardian",
        status: 'pending',
        timestamp: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "guardian_requests"), requestData);
      setMyRequests([...myRequests, { id: docRef.id, ...requestData }]);
      Alert.alert("Success", "Request sent!");
    } catch (e) {
      Alert.alert("Error", "Failed to send request.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search guardian by phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          keyboardType="phone-pad"
        />
        <TouchableOpacity 
          onPress={handleSearch} 
          style={styles.searchIconBtn}
          disabled={isSearching}
        >
          {isSearching ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <MaterialIcons name="search" size={24} color="#4CAF50" />
          )}
        </TouchableOpacity>
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => {
            setSearchQuery("");
            setUsers([]); // Clear results on reset
          }} style={styles.clearBtn}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.resultsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {isSearching ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : (
          users.map((item) => {
            const status = getStatus(item.uid);
            return (
              <View key={item.id} style={styles.userCard}>
                <View style={styles.avatar}>
                   <MaterialIcons name="account-circle" size={50} color="#ccc" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userRole}>{item.userType}</Text>
                </View>

                {status === "accepted" ? (
                  <View style={styles.friendBadge}>
                    <MaterialIcons name="check" size={16} color="#4CAF50" />
                    <Text style={styles.friendText}>Friend</Text>
                  </View>
                ) : status === "pending" ? (
                  <TouchableOpacity style={styles.pendingBtn} disabled>
                    <Text style={styles.pendingText}>Requested</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item)}>
                    <MaterialIcons name="person-add" size={18} color="#fff" />
                    <Text style={styles.addText}>Add Friend</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        
        {!isSearching && users.length === 0 && searchQuery === "" && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search" size={80} color="#f0f0f0" />
            <Text style={styles.emptyText}>Find your friends and guardians</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  searchHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backBtn: { padding: 5 },
  searchInput: { flex: 1, height: 40, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, marginLeft: 10, fontSize: 16 },
  searchIconBtn: { padding: 8, marginRight: 5 },
  clearBtn: { padding: 5 },
  resultsList: { padding: 15 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { marginRight: 15 },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1c1e21' },
  userRole: { fontSize: 13, color: '#65676b' },
  addBtn: { backgroundColor: '#1877f2', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  addText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 14 },
  pendingBtn: { backgroundColor: '#e4e6eb', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  pendingText: { color: '#4b4b4b', fontWeight: 'bold', fontSize: 14 },
  friendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e7f3ff', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  friendText: { color: '#1877f2', fontWeight: 'bold', marginLeft: 4, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
});
