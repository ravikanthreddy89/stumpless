export interface PresentationRequest {
  id: string;
  client_id: string;
  client_id_scheme: string;
  response_type: string;
  response_mode: string;
  response_uri: string;
  nonce: string;
  state: string;
  presentation_definition: PresentationDefinition;
  expires_at: number;
}

export interface PresentationDefinition {
  id: string;
  input_descriptors: InputDescriptor[];
}

export interface InputDescriptor {
  id: string;
  name: string;
  purpose: string;
  constraints: {
    fields: FieldConstraint[];
  };
}

export interface FieldConstraint {
  path: string[];
  filter?: {
    type: string;
    contains?: { const: string };
    const?: string;
  };
}

export interface PresentationResponse {
  state: string;
  vp_token: string;
  presentation_submission: PresentationSubmission;
}

export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMap[];
}

export interface DescriptorMap {
  id: string;
  format: string;
  path: string;
}

export interface VerifierConfig {
  did: string;
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
  verifierUrl: string;
}

export interface VerificationResult {
  verified: boolean;
  holder?: string;
  credentials?: VerifiedCredential[];
  error?: string;
}

export interface VerifiedCredential {
  type: string[];
  issuer: string;
  subject: string;
  claims: Record<string, unknown>;
  issuanceDate: string;
  expirationDate?: string;
}
