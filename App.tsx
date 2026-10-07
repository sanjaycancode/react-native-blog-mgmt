import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { StatusBar } from 'expo-status-bar';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import HomeScreen from './app/index';
import { ThemeProvider, useTheme } from './constants/theme';

function MainApp() {
  const { colors, isDark } = useTheme();
  const [currentRoute, setCurrentRoute] = useState('home');

  const handleNavigate = (route: string) => {
    setCurrentRoute(route);
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar style={isDark ? 'dark' : 'light'} />
      <View style={styles.main}>
        <HomeScreen onNavigate={handleNavigate} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
  },
});
