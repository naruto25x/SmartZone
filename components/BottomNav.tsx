import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface BottomNavProps {
  activeTab: 'Home' | 'Alerts' | 'Profile' | 'Helpline';
  userType: 'Student' | 'Guardian';
}

export default function BottomNav({ activeTab, userType }: BottomNavProps) {
  const router = useRouter();

  const handleNav = (route: string) => {
    // Role-specific routing logic
    if (route === "./DashboardPage") {
      router.replace(userType === 'Guardian' ? "/guardian/home" : "/student/home");
    } else if (route === "./Alerts") {
      router.replace(userType === 'Guardian' ? "/guardian/alerts" : "/student/alerts");
    } else if (route === "./Profile") {
      router.replace(userType === 'Guardian' ? "/guardian/profile" : "/student/profile");
    } else if (route === "./Helpline") {
      router.replace("/student/Helpline");
    } else {
      router.replace(route as any);
    }
  };

  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleNav("./DashboardPage")}
      >
        <MaterialIcons 
          name="home" 
          size={24} 
          color={activeTab === 'Home' ? "#4CAF50" : "#ccc"} 
        />
        <Text style={[styles.navText, activeTab === 'Home' && styles.activeNavText]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleNav("./Alerts")}
      >
        <MaterialIcons 
          name={activeTab === 'Alerts' ? "notifications" : "notifications-none"} 
          size={24} 
          color={activeTab === 'Alerts' ? "#4CAF50" : "#ccc"} 
        />
        <Text style={[styles.navText, activeTab === 'Alerts' && styles.activeNavText]}>Alerts</Text>
      </TouchableOpacity>

      {userType === 'Student' && (
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => handleNav("./Helpline")}
        >
          <MaterialIcons 
            name="phone" 
            size={24} 
            color={activeTab === 'Helpline' ? "#4CAF50" : "#ccc"} 
          />
          <Text style={[styles.navText, activeTab === 'Helpline' && styles.activeNavText]}>Helpline</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        style={styles.navItem} 
        onPress={() => handleNav("./Profile")}
      >
        <MaterialIcons 
          name={activeTab === 'Profile' ? "person" : "person-outline"} 
          size={24} 
          color={activeTab === 'Profile' ? "#4CAF50" : "#ccc"} 
        />
        <Text style={[styles.navText, activeTab === 'Profile' && styles.activeNavText]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: { flexDirection: "row", height: 70, borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff", justifyContent: "space-around", alignItems: "center" },
  navItem: { alignItems: "center", flex: 1 },
  navText: { fontSize: 12, color: "#ccc", marginTop: 4 },
  activeNavText: { color: "#4CAF50" },
});
