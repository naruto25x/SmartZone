import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { commonStyles } from "../styles/commonStyles";

export default function Page4() {
  const router = useRouter(); 
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  return (
    <ScrollView 
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
      }
    >
      <View style={commonStyles.container}>
        <View style={commonStyles.headerBar}>
          <Text style={commonStyles.headerText}>Smart SafeZone</Text>
        </View>

        <View style={commonStyles.content}>
          <View style={commonStyles.circle}>
            <Ionicons name="alert-circle" size={80} color="#4CAF50" />
          </View>
          <Text style={commonStyles.feature}>Emergency SOS</Text>
          <Text style={commonStyles.desc}>
            Quick access to emergency alerts that instantly notify your trusted contacts with your location.
          </Text>
        </View>

        <View style={commonStyles.footer}>
          <View style={commonStyles.dots}>
            <View style={[commonStyles.dot, { backgroundColor: "#ccc" }]} />
            <View style={[commonStyles.dot, { backgroundColor: "#ccc" }]} />
            <View style={[commonStyles.dot, { backgroundColor: "#4CAF50" }]} />
          </View>
          <TouchableOpacity style={commonStyles.button} onPress={() => router.push("./login")}>
            <Text style={commonStyles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

      