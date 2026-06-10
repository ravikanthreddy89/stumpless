export interface CredentialOffer {
  credential_issuer: string;
  credentials: string[];
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': string;
      user_pin_required: boolean;
    };
  };
}

export interface TokenRequest {
  grant_type: string;
  'pre-authorized_code'?: string;
  user_pin?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  c_nonce: string;
  c_nonce_expires_in: number;
}

export interface CredentialRequest {
  format: string;
  types?: string[];
  proof?: {
    proof_type: string;
    jwt: string;
  };
}

export interface IssuerConfig {
  did: string;
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
  issuerUrl: string;
}

export interface PendingOffer {
  preAuthorizedCode: string;
  credentialType: string;
  subjectData: Record<string, unknown>;
  expiresAt: number;
  pin?: string;
}

export interface IssuedToken {
  accessToken: string;
  cNonce: string;
  credentialType: string;
  subjectData: Record<string, unknown>;
  expiresAt: number;
}
