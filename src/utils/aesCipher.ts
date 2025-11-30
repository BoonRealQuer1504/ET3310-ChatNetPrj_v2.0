// ./src/utils/aesCipher.ts (bổ sung)

import CryptoJS from "react-native-crypto-js";

const randomIv = () => {
  // 16 bytes IV
  const ivWords = CryptoJS.lib.WordArray.random(16);
  return ivWords;
};

const prepareKey = (key: string) => {
  let k = key.padEnd(32, "0");
  k = k.slice(0, 32);
  return CryptoJS.enc.Utf8.parse(k);
};

export const encryptAES = (plainText: string, key: string, ivArg?: CryptoJS.lib.WordArray): string => {
  const iv = ivArg ?? CryptoJS.enc.Utf8.parse("1234567890123456");
  const cipher = CryptoJS.AES.encrypt(plainText, prepareKey(key), {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return cipher.toString(); // Base64
};

export const decryptAES = (cipherText: string, key: string, ivArg?: CryptoJS.lib.WordArray): string => {
  const iv = ivArg ?? CryptoJS.enc.Utf8.parse("1234567890123456");
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, prepareKey(key), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "";
  }
};

// Helper: encrypt a raw base64 string (file data). Returns { iv: base64, data: cipherBase64 }
export const encryptBase64File = (base64Plain: string, key: string) => {
  const ivWord = randomIv();
  const ivBase64 = CryptoJS.enc.Base64.stringify(ivWord);
  // encrypt the *base64 string* (treat base64 as plaintext)
  const cipherBase64 = encryptAES(base64Plain, key, ivWord);
  return { iv: ivBase64, data: cipherBase64 };
};

// Helper: decrypt file container => returns plain base64 (string)
export const decryptBase64File = (container: { iv: string; data: string }, key: string) => {
  try {
    const ivWord = CryptoJS.enc.Base64.parse(container.iv);
    const plainBase64 = decryptAES(container.data, key, ivWord);
    return plainBase64; // may be '' if error
  } catch (e) {
    return "";
  }
};


export const isValidKey = (key: string): boolean => {
  return typeof key === "string" && key.trim().length >= 4;
};
