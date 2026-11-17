# Apple verification trust anchors

Public certificates obtained over HTTPS from Apple's certificate authority:

- https://www.apple.com/certificateauthority/AppleRootCA-G2.cer
  SHA-256: `c2b9b042dd57830e7d117dac55ac8ae19407d38e41d88f3215bc3a890444a050`
- https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
  SHA-256: `63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179`

These are public verification material, never signing/private keys. Apple's official
SignedDataVerifier validates the transaction signature, chain, application,
environment and online certificate status against these roots. Transactions are
fetched afresh from Apple's authenticated Server API to check revocations.
