// export const encryptCaesar = (text: string, shift: number): string => {
//   if (!text) return '';
//
//   shift = ((shift % 26) + 26) % 26;
//
//   return text
//     .split('')
//     .map(char => {
//       const code = char.charCodeAt(0);
//
//       if (code >= 65 && code <= 90) {
//         return String.fromCharCode(((code - 65 + shift) % 26) + 65);
//       }
//
//       if (code >= 97 && code <= 122) {
//         return String.fromCharCode(((code - 97 + shift) % 26) + 97);
//       }
//
//       if (code >= 48 && code <= 57) {
//         return String.fromCharCode(((code - 48 + shift) % 10) + 48);
//       }
//
//       return char;
//     })
//     .join('');
// };


const START = 32;   // space
const SIZE = 95;    // từ space (32) đến ~ (126) → 95 ký tự

export const encryptCaesar = (text: string, shift: number): string => {
  if (!text) return '';

  shift = ((shift % SIZE) + SIZE) % SIZE;
  if (shift === 0) return text;

  return text.split('').map(char => {
    const code = char.charCodeAt(0);

    // Chỉ mã hóa các ký tự in được (32 đến 126): số, chữ, dấu, space...
    if (code >= START && code < START + SIZE) {
      return String.fromCharCode(((code - START + shift) % SIZE) + START);
    }

    // Giữ nguyên các ký tự Unicode (tiếng Việt, emoji, ký tự đặc biệt ngoài phạm vi)
    return char;
  }).join('');
};

export const decryptCaesar = (text: string, shift: number): string => {
  if (!text) return '';
  return encryptCaesar(text, -shift);
};

export const isValidKey = (key: string): boolean => {
  const numKey = parseInt(key, 10);
  return !isNaN(numKey) && numKey > 0 && numKey <= 25;
};

export const parseKey = (key: string): number => {
  return parseInt(key, 10) || 0;
};


