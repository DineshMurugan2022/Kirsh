import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="otp" options={{ title: 'OTP Verification' }} />
      <Stack.Screen name="blocked" options={{ headerShown: false }} />
    </Stack>
  );
}
