import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { commonStyles } from "../styles/commonStyles";

export default function Page2() {
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
            <Ionicons name="location" size={80} color="#4CAF50" />
          </View>
          <Text style={commonStyles.feature}>Live Location Sharing</Text>
          <Text style={commonStyles.desc}>
            Share your real-time location with trusted contacts and keep your loved ones informed.
          </Text>
        </View>

        <View style={commonStyles.footer}>
          <View style={commonStyles.dots}>
            <View style={[commonStyles.dot, { backgroundColor: "#4CAF50" }]} />
            <View style={[commonStyles.dot, { backgroundColor: "#ccc" }]} />
            <View style={[commonStyles.dot, { backgroundColor: "#ccc" }]} />
          </View>
          <TouchableOpacity style={commonStyles.button} onPress={() => router.push("./page3")}>
            <Text style={commonStyles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
