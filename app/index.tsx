import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

// Responsive font scale
const scaleFont = (size: number) => (width / 375) * size;

export default function HomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("./splash");
    }, 2500); // 2.5 seconds pore splash page e niye jabe

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to our safety app</Text>
      <Text style={styles.subtitle}>
        Keeping you safe, whenever you go.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4CAF50", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  title: { fontSize: scaleFont(26), fontWeight: "bold", color: "#fff", textAlign: "center", marginBottom: 5 },
  subtitle: { fontSize: scaleFont(16), color: "#e8f5e9", textAlign: "center", marginTop: 8, opacity: 0.9 },
});
