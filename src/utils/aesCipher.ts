import CryptoJS from "react-native-crypto-js";

// Tạo IV cố định hoặc tạo ngẫu nhiên
// NẾU muốn tăng bảo mật, ta có thể gửi IV kèm ciphertext (sau)
const IV = CryptoJS.enc.Utf8.parse("1234567890123456"); // 16 bytes

// AES-256-CBC cần key = 32 bytes
const prepareKey = (key: string) => {
  let k = key.padEnd(32, "0");   // nếu key ngắn -> tự pad
  k = k.slice(0, 32);            // nếu dài -> cắt 32 byte
  return CryptoJS.enc.Utf8.parse(k);
};

export const encryptAES = (plainText: string, key: string): string => {
  if (!plainText || !key) return "";

  const cipher = CryptoJS.AES.encrypt(plainText, prepareKey(key), {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return cipher.toString(); // Base64
};

export const decryptAES = (cipherText: string, key: string): string => {
  if (!cipherText || !key) return "";

  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, prepareKey(key), {
      iv: IV,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "[Lỗi giải mã AES: sai key hoặc dữ liệu hỏng]";
  }
};

export const isValidKey = (key: string): boolean => {
  return typeof key === "string" && key.trim().length >= 4;
};
