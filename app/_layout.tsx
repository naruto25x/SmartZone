// import { Stack } from "expo-router";

// export default function RootLayout() {
//   return <Stack />;
// }
import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,   // সব পেজে default header hide থাকবে
      }}
    />
  );
}
