import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktop } from '../../src/useResponsive';
import { ThemeProvider, useTheme } from '../../src/ThemeContext';

const TAB_ITEMS = [
  { name: 'index', title: 'Dashboard', icon: 'home' as const },
  { name: 'projects', title: 'Projects', icon: 'folder' as const },
  { name: 'transactions', title: 'Transactions', icon: 'list' as const },
  { name: 'inventory', title: 'Inventory', icon: 'cube' as const },
  { name: 'partners', title: 'Partners', icon: 'people' as const },
];

// Wrap everything in ThemeProvider so all screens get theme access
export default function RootLayout() {
  return (
    <ThemeProvider>
      <TabLayout />
    </ThemeProvider>
  );
}

function TabLayout() {
  const isDesktop = useIsDesktop();
  const { theme, isDark, toggleTheme } = useTheme();
  const T = theme;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: T.tabBg,
              borderTopWidth: 1,
              borderTopColor: T.border,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: T.headerBg },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShown: !isDesktop,
        sceneStyle: isDesktop
          ? { marginLeft: 240, backgroundColor: T.bg }
          : { backgroundColor: T.bg },
        // Dark mode toggle button in every screen header (mobile)
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 6 }}>
            <Ionicons
              name={isDark ? 'moon' : 'sunny'}
              size={16}
              color="#FFF"
            />
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
              thumbColor="#FFFFFF"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        ),
      }}
      tabBar={isDesktop ? (props) => <DesktopSidebar {...props} /> : undefined}
    >
      {TAB_ITEMS.map((item) => (
        <Tabs.Screen
          key={item.name}
          name={item.name}
          options={{
            title: item.title,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={item.icon} size={size} color={color} />
            ),
            headerTitle: item.name === 'index' ? 'Aruvi Housing Solutions' : item.title,
          }}
        />
      ))}
    </Tabs>
  );
}

function DesktopSidebar({ state, descriptors, navigation }: any) {
  const { theme, isDark, toggleTheme } = useTheme();
  const T = theme;

  return (
    <View style={[ds.sidebar, { backgroundColor: T.card, borderRightColor: T.border }]}>
      {/* Logo Section */}
      <View style={[ds.logoSection, { backgroundColor: T.headerBg }]}>
        <View style={ds.logoCircle}>
          <Ionicons name="business" size={28} color="#FFF" />
        </View>
        <Text style={ds.logoTitle}>Aruvi Housing</Text>
        <Text style={ds.logoSubtitle}>Solutions</Text>
      </View>

      {/* Nav Items */}
      <View style={ds.navSection}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const tabItem = TAB_ITEMS[index];
          if (!tabItem) return null;

          return (
            <TouchableOpacity
              key={route.key}
              testID={`sidebar-${tabItem.name}`}
              style={[
                ds.navItem,
                isFocused && { backgroundColor: isDark ? '#1B5E20' : '#E8F5E9' }
              ]}
              onPress={() => { if (!isFocused) navigation.navigate(route.name); }}
            >
              <Ionicons
                name={tabItem.icon}
                size={22}
                color={isFocused ? T.primary : T.muted}
              />
              <Text style={[
                ds.navLabel,
                { color: T.muted },
                isFocused && { color: T.primary, fontWeight: '700' }
              ]}>
                {tabItem.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dark Mode Toggle in Sidebar Footer */}
      <View style={[ds.sidebarFooter, { borderTopColor: T.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={16} color={T.muted} />
            <Text style={{ fontSize: 12, color: T.muted }}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#E0E0E0', true: T.primary }}
            thumbColor="#FFFFFF"
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
        <Text style={[ds.footerText, { color: T.muted, marginTop: 8 }]}>v1.0 - Web Dashboard</Text>
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  sidebar: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0, top: 0, bottom: 0, width: 240,
    borderRightWidth: 1, paddingTop: 0, zIndex: 100,
  },
  logoSection: {
    padding: 24, paddingTop: 32, alignItems: 'center',
  },
  logoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  logoSubtitle: { fontSize: 14, fontWeight: '600', color: '#FFF', opacity: 0.9 },
  navSection: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 10, marginBottom: 4,
  },
  navLabel: { fontSize: 15, fontWeight: '500' },
  sidebarFooter: {
    padding: 16, borderTopWidth: 1, alignItems: 'center',
  },
  footerText: { fontSize: 11 },
});
