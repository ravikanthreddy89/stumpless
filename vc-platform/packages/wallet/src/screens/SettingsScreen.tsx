import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { getOrCreateIdentity } from '../services/wallet';
import { WalletIdentity } from '../types';

export default function SettingsScreen() {
  const [identity, setIdentity] = useState<WalletIdentity | null>(null);

  useEffect(() => {
    getOrCreateIdentity().then(setIdentity);
  }, []);

  const copyDid = async () => {
    if (!identity) return;
    await Clipboard.setStringAsync(identity.did);
    Alert.alert('Copied', 'Your DID has been copied to clipboard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Identity</Text>
        <Text style={styles.label}>Decentralized Identifier (DID)</Text>
        <TouchableOpacity style={styles.didBox} onPress={copyDid}>
          <Text style={styles.didText} selectable>
            {identity?.did || 'Loading...'}
          </Text>
          <Text style={styles.copyHint}>Tap to copy</Text>
        </TouchableOpacity>
        {identity && (
          <Text style={styles.created}>
            Created: {new Date(identity.createdAt).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Protocol</Text>
          <Text style={styles.infoValue}>OID4VCI + OID4VP</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DID Method</Text>
          <Text style={styles.infoValue}>did:key</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Key Algorithm</Text>
          <Text style={styles.infoValue}>Ed25519</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>VC Format</Text>
          <Text style={styles.infoValue}>JWT (jwt_vc_json)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, gap: 16 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: 1 },
  label: { color: '#888', fontSize: 13 },
  didBox: { backgroundColor: '#0d0d1a', borderRadius: 8, padding: 12, gap: 4 },
  didText: { color: '#e0e0e0', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  copyHint: { color: '#4f8ef7', fontSize: 11, marginTop: 4 },
  created: { color: '#666', fontSize: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
