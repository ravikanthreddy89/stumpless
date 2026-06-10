import { Router, Request, Response } from 'express';
import { IssuerConfig } from '../types';

export function metadataRouter(issuerConfig: IssuerConfig): Router {
  const router = Router();

  router.get('/.well-known/openid-credential-issuer', (_req: Request, res: Response) => {
    res.json({
      credential_issuer: issuerConfig.issuerUrl,
      authorization_endpoint: `${issuerConfig.issuerUrl}/authorize`,
      token_endpoint: `${issuerConfig.issuerUrl}/token`,
      credential_endpoint: `${issuerConfig.issuerUrl}/credential`,
      credentials_supported: [
        {
          format: 'jwt_vc_json',
          id: 'UniversityDegreeCredential',
          types: ['VerifiableCredential', 'UniversityDegreeCredential'],
          cryptographic_binding_methods_supported: ['did:key'],
          cryptographic_suites_supported: ['EdDSA'],
          display: [
            {
              name: 'University Degree',
              locale: 'en-US',
              logo: { url: 'https://example.com/logo.png', alt_text: 'University Logo' },
              background_color: '#1a1a2e',
              text_color: '#ffffff',
            },
          ],
        },
        {
          format: 'jwt_vc_json',
          id: 'EmploymentCredential',
          types: ['VerifiableCredential', 'EmploymentCredential'],
          cryptographic_binding_methods_supported: ['did:key'],
          cryptographic_suites_supported: ['EdDSA'],
          display: [
            {
              name: 'Employment Certificate',
              locale: 'en-US',
              background_color: '#16213e',
              text_color: '#ffffff',
            },
          ],
        },
        {
          format: 'jwt_vc_json',
          id: 'IdentityCredential',
          types: ['VerifiableCredential', 'IdentityCredential'],
          cryptographic_binding_methods_supported: ['did:key'],
          cryptographic_suites_supported: ['EdDSA'],
          display: [
            {
              name: 'Identity Document',
              locale: 'en-US',
              background_color: '#0f3460',
              text_color: '#ffffff',
            },
          ],
        },
      ],
      display: [{ name: 'VC Platform Issuer', locale: 'en-US' }],
    });
  });

  router.get('/.well-known/did.json', (_req: Request, res: Response) => {
    const verificationMethod = `${issuerConfig.did}#${issuerConfig.did.replace('did:key:', '')}`;
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: issuerConfig.did,
      verificationMethod: [
        {
          id: verificationMethod,
          type: 'Ed25519VerificationKey2020',
          controller: issuerConfig.did,
          publicKeyMultibase: issuerConfig.did.replace('did:key:', ''),
        },
      ],
      authentication: [verificationMethod],
      assertionMethod: [verificationMethod],
    });
  });

  return router;
}
