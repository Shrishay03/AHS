import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsDesktop } from '../../src/useResponsive';

const T = { primary: '#2E7D32', secondary: '#1976D2', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575' };

const TAB_ITEMS = [
  { name: 'index', title: 'Dashboard', icon: 'home' as const },
  { name: 'projects', title: 'Projects', icon: 'folder' as const },
  { name: 'transactions', title: 'Transactions', icon: 'list' as const },
  { name: 'inventory', title: 'Inventory', icon: 'cube' as const },
  { name: 'partners', title: 'Partners', icon: 'people' as const },
];

export default function TabLayout() {
  const isDesktop = useIsDesktop();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: T.card,
              borderTopWidth: 1,
              borderTopColor: '#E0E0E0',
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: T.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShown: !isDesktop,
        sceneStyle: isDesktop ? { marginLeft: 240 } : undefined,
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
  return (
    <View style={ds.sidebar}>
      {/* Logo Section */}
      <View style={ds.logoSection}>
        <View style={ds.logoCircle}>
          <Ionicons name="business" size={28} color="#FFF" />
        </View>
        <Text style={ds.logoTitle}>Aruvi Housing</Text>
        <Text style={ds.logoSubtitle}>Solutions</Text>
      </View>

      {/* Nav Items */}
      <View style={ds.navSection}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const tabItem = TAB_ITEMS[index];
          if (!tabItem) return null;

          return (
            <TouchableOpacity
              key={route.key}
              testID={`sidebar-${tabItem.name}`}
              style={[ds.navItem, isFocused && ds.navItemActive]}
              onPress={() => {
                if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }}
            >
              <Ionicons
                name={tabItem.icon}
                size={22}
                color={isFocused ? T.primary : T.muted}
              />
              <Text style={[ds.navLabel, isFocused && ds.navLabelActive]}>
                {tabItem.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer */}
      <View style={ds.sidebarFooter}>
        <Text style={ds.footerText}>v1.0 - Web Dashboard</Text>
      </View>
    </View>
  );
}

const ds = StyleSheet.create({
  sidebar: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 240,
    backgroundColor: T.card,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    paddingTop: 0,
    zIndex: 100,
  },
  logoSection: {
    backgroundColor: T.primary,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.9,
  },
  navSection: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#E8F5E9',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: T.muted,
  },
  navLabelActive: {
    color: T.primary,
    fontWeight: '700',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: T.muted,
  },
});
