export interface StoredCredential {
  id: string;
  jwt: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  subject: string;
  claims: Record<string, unknown>;
  displayName: string;
  backgroundColor: string;
  addedAt: number;
}

export interface WalletIdentity {
  did: string;
  privateKeyBase64: string;
  publicKeyBase64: string;
  createdAt: number;
}

export interface OID4VCIConfig {
  issuerUrl: string;
  preAuthorizedCode: string;
  userPinRequired: boolean;
  credentialType: string;
}
