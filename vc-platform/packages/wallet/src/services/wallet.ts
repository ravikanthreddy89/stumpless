import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJwt } from 'jose';
import { WalletIdentity, StoredCredential } from '../types';
import { generateDidKey } from './crypto';

const IDENTITY_KEY = 'wallet_identity';
const CREDENTIALS_KEY = 'wallet_credentials';

export async function getOrCreateIdentity(): Promise<WalletIdentity> {
  const stored = await SecureStore.getItemAsync(IDENTITY_KEY);
  if (stored) {
    return JSON.parse(stored) as WalletIdentity;
  }

  const { did, privateKeyBytes, publicKeyBytes } = await generateDidKey();
  const identity: WalletIdentity = {
    did,
    privateKeyBase64: Buffer.from(privateKeyBytes).toString('base64'),
    publicKeyBase64: Buffer.from(publicKeyBytes).toString('base64'),
    createdAt: Date.now(),
  };

  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

export async function getCredentials(): Promise<StoredCredential[]> {
  const stored = await AsyncStorage.getItem(CREDENTIALS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function saveCredential(jwt: string): Promise<StoredCredential> {
  const payload = decodeJwt(jwt);
  const vc = payload.vc as Record<string, unknown>;

  const credSubject = vc.credentialSubject as Record<string, unknown>;
  const { id: subjectId, ...claims } = credSubject;

  const types = (vc.type as string[]) || ['VerifiableCredential'];
  const displayType = types.find((t) => t !== 'VerifiableCredential') || 'VerifiableCredential';

  const colors: Record<string, string> = {
    UniversityDegreeCredential: '#1a1a2e',
    EmploymentCredential: '#16213e',
    IdentityCredential: '#0f3460',
  };

  const credential: StoredCredential = {
    id: (payload.jti as string) || `cred_${Date.now()}`,
    jwt,
    type: types,
    issuer: vc.issuer as string,
    issuanceDate: vc.issuanceDate as string,
    expirationDate: vc.expirationDate as string | undefined,
    subject: (subjectId as string) || '',
    claims,
    displayName: displayType.replace(/([A-Z])/g, ' $1').trim(),
    backgroundColor: colors[displayType] || '#1a1a2e',
    addedAt: Date.now(),
  };

  const credentials = await getCredentials();
  credentials.push(credential);
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));

  return credential;
}

export async function deleteCredential(id: string): Promise<void> {
  const credentials = await getCredentials();
  const filtered = credentials.filter((c) => c.id !== id);
  await AsyncStorage.setItem(CREDENTIALS_KEY, JSON.stringify(filtered));
}
