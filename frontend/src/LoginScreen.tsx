import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './AuthContext';

const T = { primary: '#2E7D32', bg: '#F5F5F5', card: '#FFF', text: '#212121', muted: '#757575', err: '#F44336' };

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return; }
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) { setError(err); }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.content}>
        {/* Logo Section */}
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Ionicons name="business" size={48} color="#FFF" />
          </View>
          <Text style={s.appName}>Aruvi Housing</Text>
          <Text style={s.appName}>Solutions</Text>
          <Text style={s.tagline}>Finance & Project Management</Text>
        </View>

        {/* Login Form */}
        <View style={s.formCard}>
          <Text style={s.formTitle}>Sign In</Text>

          {error ? (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={18} color={T.err} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={s.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={T.muted} style={s.inputIcon} />
            <TextInput
              testID="login-email-input"
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={T.muted} style={s.inputIcon} />
            <TextInput
              testID="login-password-input"
              style={[s.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            testID="login-submit-btn"
            style={[s.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={s.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>Secure access for authorized personnel only</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: T.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  appName: { fontSize: 28, fontWeight: 'bold', color: T.text, lineHeight: 34 },
  tagline: { fontSize: 14, color: T.muted, marginTop: 8 },
  formCard: { backgroundColor: T.card, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: T.text, marginBottom: 20, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 13, color: T.err, flex: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, backgroundColor: T.bg, marginBottom: 16, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: T.text },
  eyeBtn: { padding: 8 },
  loginBtn: { backgroundColor: T.primary, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  loginBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  footer: { textAlign: 'center', fontSize: 12, color: T.muted, marginTop: 24 },
});
