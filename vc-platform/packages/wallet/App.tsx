import 'react-native-get-random-values';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import ScanScreen from './src/screens/ScanScreen';
import CredentialDetailScreen from './src/screens/CredentialDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const navTheme = {
  dark: true,
  colors: {
    primary: '#4f8ef7',
    background: '#0d0d1a',
    card: '#1a1a2e',
    text: '#ffffff',
    border: '#2a2a3e',
    notification: '#4f8ef7',
  },
};

function WalletStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Wallet" component={HomeScreen} options={{ title: 'My Wallet' }} />
      <Stack.Screen
        name="CredentialDetail"
        component={CredentialDetailScreen}
        options={{ title: 'Credential' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: { backgroundColor: '#1a1a2e', borderTopColor: '#2a2a3e' },
            tabBarActiveTintColor: '#4f8ef7',
            tabBarInactiveTintColor: '#666',
            headerShown: false,
          }}
        >
          <Tab.Screen
            name="Home"
            component={WalletStack}
            options={{
              tabBarLabel: 'Wallet',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🪪</Text>,
            }}
          />
          <Tab.Screen
            name="Scan"
            component={ScanScreen}
            options={{
              tabBarLabel: 'Scan',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📷</Text>,
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a2e' },
              headerTintColor: '#fff',
              title: 'Scan QR Code',
            }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              tabBarLabel: 'Settings',
              tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
              headerShown: true,
              headerStyle: { backgroundColor: '#1a1a2e' },
              headerTintColor: '#fff',
              title: 'Settings',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
