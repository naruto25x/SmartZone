import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Contacts from "expo-contacts";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../../FirebaseConfig";

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  interface Contact {
    id: string;
    fireId?: string;
    name: string;
    phone: string;
    relationship: string;
  }

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For Save/Update operations
  const [isPickerLoading, setIsPickerLoading] = useState(false); // For Phone Contact Picker Only

  // Load contacts from Local and Firebase
  useEffect(() => {
    loadSavedContacts();
  }, []);

  const loadSavedContacts = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setContacts([]);
        return;
      }

      // 1. Load from LOCAL Storage first (Instant)
      const cached = await AsyncStorage.getItem(`emergency_contacts_${user.uid}`);
      if (cached) {
        setContacts(JSON.parse(cached));
      }

      // 2. Fetch from Firebase in background (Updates if changes exist)
      const q = query(collection(db, "emergency_contacts"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fbContacts: Contact[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fbContacts.push({
          id: data.tempId || doc.id,
          fireId: doc.id,
          name: data.name,
          phone: data.phone,
          relationship: data.relationship
        });
      });

      // 3. Update state and cache with fresh data
      fbContacts.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(fbContacts);
      await AsyncStorage.setItem(`emergency_contacts_${user.uid}`, JSON.stringify(fbContacts));
      
      // Clean up old generic key if it exists
      await AsyncStorage.removeItem("emergency_contacts");

    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadSavedContacts();
    setRefreshing(false);
  }, []);

  const loadContactsFromPhone = async () => {
    setIsPickerLoading(true);
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status === "granted") {
      try {
        const contact = await Contacts.presentContactPickerAsync();

        if (contact) {
          let fullName = contact.name;
          if (!fullName) {
            fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          }
          const phoneNumber = (contact.phoneNumbers && contact.phoneNumbers.length > 0) 
            ? contact.phoneNumbers[0].number 
            : "";
          setName(fullName || "");
          setPhone(phoneNumber || "");
        }
      } catch (error) {
        console.log("Contact picker error:", error);
      }
    } else {
      Alert.alert("Permission Denied", "We need permission to access your contacts.");
    }
    setIsPickerLoading(false);
  };

  const handleAddContact = async () => {
    if (!name || !phone) {
      Alert.alert("Error", "Please enter both name and phone number");
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      let updatedContacts = [...contacts];
      let fireIdToSave = undefined;

      // 1. Update UI and Local Storage immediately (Optimistic Update)
      if (editingId) {
        updatedContacts = contacts.map(c => c.id === editingId ? { ...c, name, phone, relationship } : c);
      } else {
        const tempId = Date.now().toString();
        const newContact: Contact = {
          id: tempId,
          name,
          phone,
          relationship: relationship || "Family/Friend"
        };
        updatedContacts = [...contacts, newContact];
      }

      updatedContacts.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(updatedContacts);
      if (user) {
        await AsyncStorage.setItem(`emergency_contacts_${user.uid}`, JSON.stringify(updatedContacts));
      }
      
      // Clear inputs immediately
      setName("");
      setPhone("");
      setRelationship("");
      setEditingId(null);
      setIsAdding(false);
      setIsLoading(false); // Stop loading early for better UX

      // 2. Sync with Firebase in the background
      if (user) {
        try {
          if (editingId) {
            const contactToUpdate = contacts.find(c => c.id === editingId);
            if (contactToUpdate?.fireId) {
              await updateDoc(doc(db, "emergency_contacts", contactToUpdate.fireId), {
                name, phone, relationship
              });
            }
          } else {
            const docRef = await addDoc(collection(db, "emergency_contacts"), {
              userId: user.uid,
              name,
              phone,
              relationship: relationship || "Family/Friend",
              createdAt: new Date()
            });
            
            // Update the local contact with the real fireId from background
            const lastIndex = updatedContacts.length - 1;
            updatedContacts[lastIndex].fireId = docRef.id;
            setContacts([...updatedContacts]);
            await AsyncStorage.setItem(`emergency_contacts_${user.uid}`, JSON.stringify(updatedContacts));
          }
        } catch (fbError) {
          console.error("Firebase sync error:", fbError);
        }
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Could not save contact. Working locally.");
    }
    setIsLoading(false);
  };

  const handleDelete = async (contact: Contact) => {
    Alert.alert("Delete", "Are you sure you want to delete this contact?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          try {
            // 1. Update UI and Local Storage immediately (Optimistic Delete)
            const user = auth.currentUser;
            const updated = contacts.filter(c => c.id !== contact.id);
            setContacts(updated);
            if (user) {
              await AsyncStorage.setItem(`emergency_contacts_${user.uid}`, JSON.stringify(updated));
            }

            // 2. Delete from Firebase in the background
            if (contact.fireId) {
              try {
                await deleteDoc(doc(db, "emergency_contacts", contact.fireId));
              } catch (fbError) {
                console.error("Firebase delete error:", fbError);
                // If it fails on server, we might want to alert or retry, 
                // but for speed we already removed it from UI
              }
            }
          } catch (error) {
            console.error("Delete error:", error);
            Alert.alert("Error", "Could not delete contact.");
          }
        }
      }
    ]);
  };

  const handleEdit = (contact: any) => {
    setName(contact.name);
    setPhone(contact.phone);
    setRelationship(contact.relationship);
    setEditingId(contact.id);
    setIsAdding(true);
  };

  const cancelEdit = () => {
    setName("");
    setPhone("");
    setRelationship("");
    setEditingId(null);
    setIsAdding(false);
  };

  const isAddingGlobal = isAdding;

  const handleCall = (phoneNumber: string) => {
    let url = "";
    if (Platform.OS === "android") {
      url = `tel:${phoneNumber}`;
    } else {
      url = `telprompt:${phoneNumber}`;
    }
    Linking.openURL(url).catch((err) => console.error("Error opening dialer:", err));
  };

  const showOptions = (contact: Contact) => {
    Alert.alert(
      "Options",
      `Manage ${contact.name}`,
      [
        { text: "Edit", onPress: () => handleEdit(contact) },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(contact) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        {isAddingGlobal && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>{editingId ? "Edit Contact" : "Add Emergency Contact"}</Text>
            <Text style={styles.cardSubHeader}>This contact will be notified in case of an emergency.</Text>

            <TouchableOpacity 
              style={styles.contactsButton} 
              onPress={loadContactsFromPhone}
              disabled={isPickerLoading}
            >
              <MaterialIcons name="contacts" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
              <Text style={styles.contactsButtonText}>
                {isPickerLoading ? "Loading..." : "Choose From Phone Contacts"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Naushin Maliha"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#666"
            />
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +01XXXXXXXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#666"
            />
            
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Father, Mother, Friend"
              value={relationship}
              onChangeText={setRelationship}
              placeholderTextColor="#666"
            />

            <TouchableOpacity 
              style={styles.sendButton} 
              onPress={handleAddContact}
            >
              <MaterialIcons name={editingId ? "check" : "save"} size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>{editingId ? "Update Contact" : "Save Contact"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isAddingGlobal && (
          <>
            <TouchableOpacity 
              style={styles.addOptionButton} 
              onPress={() => setIsAdding(true)}
            >
              <View style={styles.addIconCircle}>
                <MaterialIcons name="add" size={24} color="#fff" />
              </View>
              <Text style={styles.addOptionText}>Add New Emergency Contact</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Saved Contacts</Text>
            {contacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="contact-phone" size={60} color="#eee" />
                <Text style={styles.emptyText}>No contacts saved yet.</Text>
              </View>
            ) : (
              contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactIconContainer}>
                    <MaterialIcons name="person" size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactNameText}>{contact.name}</Text>
                    <Text style={styles.contactDetailText}>{contact.phone} • {contact.relationship}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => handleCall(contact.phone)} style={styles.callButton}>
                      <MaterialIcons name="call" size={22} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showOptions(contact)}>
                      <MaterialIcons name="more-vert" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Contact Selection Modal Removed */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f9f9f9" },
  header: { backgroundColor: "#4CAF50", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  backButton: { width: 40 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", textAlign: "center", flex: 1 },
  notificationBtn: { width: 40, alignItems: "flex-end", position: "relative" },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5252", position: "absolute", top: 0, right: 0, borderWidth: 1.5, borderColor: "#4CAF50" },
  container: { padding: 20 },
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 20, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 16, color: "#333" },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 14, borderWidth: 1, borderColor: "#eee" },
  guardianButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#4CAF50' },
  guardianButtonText: { color: '#4CAF50', fontWeight: 'bold', marginLeft: 8 },
  addButton: { backgroundColor: "#4CAF50", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#333", marginBottom: 12, marginTop: 10 },
  contactCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  contactIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E8F5E9", alignItems: "center", justifyContent: "center", marginRight: 12 },
  contactInfo: { flex: 1 },
  contactNameText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  contactDetailText: { fontSize: 13, color: "#666", marginTop: 2 },
  actionButtons: { flexDirection: "row", alignItems: "center" },
  callButton: { marginRight: 20 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 10, fontSize: 14 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  addOptionButton: { backgroundColor: "#fff", borderRadius: 12, padding: 20, flexDirection: "row", alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#eee", borderStyle: "dashed" },
  addIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#4CAF50", alignItems: "center", justifyContent: "center", marginRight: 15 },
  addOptionText: { fontSize: 16, fontWeight: "bold", color: "#4CAF50" },
  cardHeader: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardSubHeader: { fontSize: 14, color: '#666', marginBottom: 30, lineHeight: 20 },
  contactsButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#4CAF50", borderStyle: 'dashed', marginBottom: 30, backgroundColor: "#f0fdf4" },
  contactsButtonText: { color: "#4CAF50", fontWeight: "bold", fontSize: 15 },
  sendButton: { backgroundColor: "#4CAF50", borderRadius: 10, paddingVertical: 16, alignItems: "center", flexDirection: 'row', justifyContent: 'center', marginTop: 10, elevation: 2 },
  sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cancelButton: { paddingVertical: 16, alignItems: "center", marginTop: 10 },
  cancelButtonText: { color: "#999", fontSize: 15, fontWeight: "500" },
});
