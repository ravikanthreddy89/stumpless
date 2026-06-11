import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { getOrCreateIdentity, saveCredential, getCredentials } from '../services/wallet';
import { parseCredentialOffer, fetchToken, fetchCredential, CredentialOfferPayload } from '../services/oid4vci';
import { parsePresentationRequest, matchCredentials, createPresentation, submitPresentation } from '../services/oid4vp';

type ScanMode = 'idle' | 'scanning' | 'processing' | 'pin_required';

export default function ScanScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [mode, setMode] = useState<ScanMode>('idle');
  const [pin, setPin] = useState('');
  const [pendingOffer, setPendingOffer] = useState<{ offer: CredentialOfferPayload } | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || mode === 'processing') return;
    setScanned(true);

    try {
      if (data.startsWith('openid-credential-offer://')) {
        await handleCredentialOffer(data);
      } else if (data.startsWith('openid4vp://')) {
        await handlePresentationRequest(data);
      } else {
        Alert.alert('Unknown QR Code', 'This QR code is not a recognized VC credential offer or presentation request.', [
          { text: 'OK', onPress: () => setScanned(false) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'An error occurred', [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const handleCredentialOffer = async (deepLink: string) => {
    const offer = parseCredentialOffer(deepLink);

    if (offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'].user_pin_required) {
      setPendingOffer({ offer });
      setMode('pin_required');
      return;
    }

    await processCredentialOffer(offer, undefined);
  };

  const processCredentialOffer = async (
    offer: CredentialOfferPayload,
    userPin: string | undefined
  ) => {
    setMode('processing');
    const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
    const identity = await getOrCreateIdentity();

    const { access_token, c_nonce } = await fetchToken(offer.credential_issuer, preAuthCode, userPin);
    const credentialType = offer.credentials[0];
    const credentialJwt = await fetchCredential(
      offer.credential_issuer,
      access_token,
      c_nonce,
      identity,
      credentialType
    );

    await saveCredential(credentialJwt);
    setMode('idle');
    navigation.navigate('Wallet');
    Alert.alert('Success', `${credentialType} credential added to your wallet!`);
  };

  const handlePresentationRequest = async (deepLink: string) => {
    setMode('processing');
    const params = parsePresentationRequest(deepLink);
    const identity = await getOrCreateIdentity();
    const allCredentials = await getCredentials();
    const definition = JSON.parse(params.presentation_definition);
    const matchedCredentials = matchCredentials(allCredentials, definition);

    if (!matchedCredentials.length) {
      setMode('idle');
      setScanned(false);
      Alert.alert(
        'No matching credentials',
        "You don't have the required credentials for this request."
      );
      return;
    }

    Alert.alert(
      'Share Credentials?',
      `The verifier is requesting:\n\n${matchedCredentials.map((c) => `• ${c.displayName}`).join('\n')}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => { setMode('idle'); setScanned(false); },
        },
        {
          text: 'Share',
          onPress: async () => {
            try {
              const vpToken = await createPresentation(
                matchedCredentials,
                identity,
                params.nonce,
                params.client_id
              );
              await submitPresentation(
                params.response_uri,
                params.state,
                vpToken,
                definition.id,
                matchedCredentials
              );
              setMode('idle');
              navigation.navigate('Wallet');
              Alert.alert('Verified!', 'Your credentials were successfully presented.');
            } catch (err: any) {
              setMode('idle');
              setScanned(false);
              Alert.alert('Error', err.message || 'Failed to present credentials');
            }
          },
        },
      ]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#4f8ef7" size="large" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Camera permission required</Text>
        <TouchableOpacity onPress={() => Camera.requestCameraPermissionsAsync()}>
          <Text style={styles.link}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      />

      <View style={styles.overlay}>
        <View style={styles.scanFrame} />
        <Text style={styles.hint}>
          {mode === 'processing' ? 'Processing...' : 'Point camera at a QR code'}
        </Text>
        {mode === 'processing' && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
      </View>

      <Modal visible={mode === 'pin_required'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <Text style={styles.modalSubtitle}>This credential requires a PIN from the issuer</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              maxLength={8}
              placeholder="Enter PIN"
              placeholderTextColor="#666"
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setMode('idle'); setScanned(false); setPin(''); setPendingOffer(null); }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={async () => {
                  if (pendingOffer) {
                    setMode('processing');
                    const p = pin;
                    setPin('');
                    setPendingOffer(null);
                    await processCredentialOffer(pendingOffer.offer, p);
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d1a' },
  errorText: { color: '#fff', fontSize: 16, marginBottom: 12 },
  link: { color: '#4f8ef7', fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: '#4f8ef7',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: { color: '#fff', marginTop: 20, fontSize: 15, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    gap: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  modalSubtitle: { fontSize: 14, color: '#888' },
  pinInput: {
    backgroundColor: '#0d0d1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  cancelButton: { backgroundColor: '#2a2a3e' },
  confirmButton: { backgroundColor: '#4f8ef7' },
  cancelButtonText: { color: '#fff', fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
});
