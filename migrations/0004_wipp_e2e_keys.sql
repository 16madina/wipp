-- DM E2E: publish identity public keys on profiles.
-- Private keys never leave the client.

ALTER TABLE wipp_profiles
  ADD COLUMN IF NOT EXISTS e2e_public_jwk JSONB;

COMMENT ON COLUMN wipp_profiles.e2e_public_jwk IS
  'ECDH P-256 public JWK for DM end-to-end encryption (client-generated).';
