import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getCredentials, deleteCredential } from '../services/wallet';
import { StoredCredential } from '../types';

export default function HomeScreen() {
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const loadCredentials = useCallback(async () => {
    const creds = await getCredentials();
    setCredentials(creds.sort((a, b) => b.addedAt - a.addedAt));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCredentials();
    }, [loadCredentials])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCredentials();
    setRefreshing(false);
  };

  const handleDelete = (cred: StoredCredential) => {
    Alert.alert('Delete Credential', `Remove "${cred.displayName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCredential(cred.id);
          loadCredentials();
        },
      },
    ]);
  };

  const isExpired = (cred: StoredCredential) =>
    cred.expirationDate ? new Date(cred.expirationDate) < new Date() : false;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {credentials.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🪪</Text>
          <Text style={styles.emptyTitle}>No Credentials Yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan a QR code from an issuer to add your first credential
          </Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('Scan')}
          >
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e0e0e0" />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: item.backgroundColor }, isExpired(item) && styles.expiredCard]}
              onPress={() => navigation.navigate('CredentialDetail', { credential: item })}
              onLongPress={() => handleDelete(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardType}>{item.displayName}</Text>
                {isExpired(item) && <Text style={styles.expiredBadge}>EXPIRED</Text>}
              </View>
              <Text style={styles.cardIssuer} numberOfLines={1}>
                Issued by: {item.issuer.length > 40 ? `${item.issuer.slice(0, 20)}...${item.issuer.slice(-10)}` : item.issuer}
              </Text>
              <Text style={styles.cardDate}>
                {new Date(item.issuanceDate).toLocaleDateString()}
                {item.expirationDate && ` · Expires ${new Date(item.expirationDate).toLocaleDateString()}`}
              </Text>
              <View style={styles.cardFooter}>
                {Object.entries(item.claims).slice(0, 2).map(([key, value]) => (
                  <Text key={key} style={styles.claimChip}>
                    {key}: {String(value)}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
  scanButton: {
    marginTop: 24,
    backgroundColor: '#4f8ef7',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  expiredCard: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardType: { fontSize: 18, fontWeight: '700', color: '#fff' },
  expiredBadge: {
    backgroundColor: '#ff4444',
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardIssuer: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  cardDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  claimChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
});
