import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { StoredCredential } from '../types';

export default function CredentialDetailScreen() {
  const route = useRoute<any>();
  const _navigation = useNavigation();
  const credential: StoredCredential = route.params.credential;
  const isExpired = credential.expirationDate
    ? new Date(credential.expirationDate) < new Date()
    : false;

  const copyJwt = async () => {
    await Clipboard.setStringAsync(credential.jwt);
    Alert.alert('Copied', 'JWT copied to clipboard');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: credential.backgroundColor }]}>
        <Text style={styles.cardType}>{credential.displayName}</Text>
        {isExpired && <Text style={styles.expiredBadge}>EXPIRED</Text>}
        <Text style={styles.cardField}>Issued: {new Date(credential.issuanceDate).toLocaleDateString()}</Text>
        {credential.expirationDate && (
          <Text style={styles.cardField}>Expires: {new Date(credential.expirationDate).toLocaleDateString()}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Credential Details</Text>
        {Object.entries(credential.claims).map(([key, value]) => (
          <View key={key} style={styles.row}>
            <Text style={styles.rowLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
            <Text style={styles.rowValue}>{String(value)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issuer</Text>
        <Text style={styles.mono} selectable>{credential.issuer}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subject DID</Text>
        <Text style={styles.mono} selectable>{credential.subject}</Text>
      </View>

      <TouchableOpacity style={styles.copyButton} onPress={copyJwt}>
        <Text style={styles.copyButtonText}>Copy JWT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 24, gap: 8 },
  cardType: { fontSize: 22, fontWeight: '700', color: '#fff' },
  expiredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff4444',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardField: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#4f8ef7', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  rowLabel: { color: '#888', fontSize: 14, flex: 1 },
  rowValue: { color: '#fff', fontSize: 14, flex: 1.5, textAlign: 'right' },
  mono: { color: '#aaa', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  copyButton: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  copyButtonText: { color: '#4f8ef7', fontWeight: '600', fontSize: 15 },
});
