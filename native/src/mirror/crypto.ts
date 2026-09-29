export type EncBlob = {
  v: 1;
  alg: "AES-GCM";
  iv: string;
  ct: string;
};
