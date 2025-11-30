# 💬 ChatNET_ver2.0 - Midterm Project

**Course: Theory of Cryptography - ET3310**

**Lecturers: Do Trong Tuan, Ma Viet Duc**

**School: Hanoi University of Science and Technology - HUST**

**Group: 4**

**Students: Nguyen Ho Trieu Duong - C41 , Nguyen Tien Dat - C42, Vu Tien Dat - C43**

**Created: Fri 21 Nov 2025 22:15:05 Hanoi, Vietnam**

ChatNET_ver2.0 là ứng dụng chat real-time sử dụng TCP Socket trực tiếp giữa hai thiết bị, hỗ trợ gửi/nhận:

✏️ Văn bản (text)

🖼️ Hình ảnh (image)

📄 Tệp PDF

Toàn bộ dữ liệu có thể được mã hóa AES-256-CBC, giúp đảm bảo tính bí mật khi truyền qua mạng nội bộ.

Ứng dụng hỗ trợ Android và iOS, có thể build thành APK để cài đặt dễ dàng.

## 🏗️ Kiến trúc & Công nghệ

### Stack công nghệ
- **Framework**: React Native 0.81.4
- **Language**: TypeScript 5.8.3
- **UI Library**: React 19.1.0
- **Networking**: 
  - `react-native-tcp-socket` - TCP communication
  - `@react-native-community/netinfo` - Network detection
- **Build Tools**: 
  - Metro Bundler
  - Gradle (Android)
  - Xcode (iOS)

### Mã hóa
Ứng dụng sử dụng **AES Block Cipher - 256 - CBC** - một phương pháp mã hóa khối đảm bảo tính bảo mật cho việc truyền thông tin trên mạng LAN:
- Hỗ trợ cả chữ thường, chữ hoa, chữ có dấu tiếng Việt, số và ký tự đặc biệt
- Khóa do người dùng tự nhập (>= 4 ký tự, tự động chuẩn hóa thành 32 bytes).
- IV được sử dụng:

  - Text: IV cố định để đảm bảo tương thích.

  - File (Ảnh/PDF): IV ngẫu nhiên cho mỗi tin nhắn → tăng tính bảo mật.
- File: `src/utils/aesCipher.ts`
Mã hóa Text

- Người dùng nhập tin nhắn.

- Ứng dụng mã hóa chuỗi tin nhắn bằng AES-256-CBC.

- Gửi ciphertext + delimiter <<END>> qua TCP.

- Bên nhận giải mã bằng cùng một khóa.

Mã hóa Ảnh & PDF

- File được đọc thành chuỗi Base64.

- Base64 được mã hóa AES, không gửi plain text.

- Gửi JSON:
```bash
{
  "type": "image/pdf",
  "content": "{\"encrypted\":true,\"iv\":\"...\",\"data\":\"...\",\"mime\":\"image/jpeg\"}"
}

```

- Bên nhận:

  - Parse JSON

  - Giải mã AES → lấy lại Base64 gốc

  - Ghép lại thành data:<mime>;base64,<data>

  - Hiển thị hoặc mở file PDF
 
Delimiter cố định: Tất cả gói tin đều kết thúc bằng delimeter để phân tách các JSON trong stream TCP.
```bash
<<END>>
```
## 📋 Yêu cầu hệ thống

### Môi trường phát triển
- **Node.js**: >= 20.x (như trong `package.json`)
- **npm** hoặc **yarn**: Để quản lý dependencies
- **Git**: Để clone và version control

### Android Development
- **Android Studio**: Godzilla (2024) hoặc mới hơn
- **JDK**: 17 hoặc 21
- **Android SDK**: 
  - Build Tools version 35.0.0
  - Platform: Android 15 (API 35)
  - NDK (nếu cần native modules)
- **Gradle**: 8.10.2
- **Android Gradle Plugin**: 8.7.3

### iOS Development (chỉ trên macOS)
- **macOS**: Ventura (13.0) hoặc mới hơn
- **Xcode**: 14.0+
- **CocoaPods**: Để quản lý iOS dependencies
- **iOS Deployment Target**: 13.4+

### Thiết bị test
- **Android**: API 21+ (Android 5.0+)
- **iOS**: iOS 13.4+
- **Network**: Cả 2 thiết bị phải cùng mạng WiFi/LAN

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone https://github.com/BoonRealQuer1504/ET3310-ChatNetPrj_v2.0
cd ET3310-ChatNetPrj_v2.0
```

### 2. Cài đặt dependencies
```bash
# Sử dụng npm
npm install

# Hoặc yarn
yarn install
```

### 3. Cài đặt iOS dependencies (chỉ trên macOS)
```bash
cd ios
pod install
cd ..
```

### 4. Kiểm tra cấu hình Android
Đảm bảo file `android/local.properties` có đường dẫn SDK. Nếu chưa có file `android/local.properties` thì có thể tạo thêm:
```properties
sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\sdk
```

## 📱 Chạy ứng dụng

### Android

#### Bước 1: Khởi động Metro Bundler
Mở terminal/command prompt và chạy:
```bash
npm start
# Hoặc
npx react-native start
```
#### Bước 2: Cài các thư viện bắt buộc
```bash
npm install react-native-tcp-socket
npm install react-native-document-picker
npm install react-native-fs
npm install react-native-file-viewer
npm install react-native-crypto-js
npm install react-native-image-picker
npm install @react-native-community/netinfo
```
#### Bước 3: Chạy trên thiết bị/emulator
Mở terminal mới (giữ Metro chạy) và thực thi:
```bash
# Chạy trên emulator hoặc thiết bị đã kết nối
npm run android

# Hoặc dùng React Native CLI trực tiếp
npx react-native run-android
```

**Lưu ý**: 
- Đảm bảo USB Debugging đã bật trên thiết bị Android
- Kiểm tra thiết bị đã kết nối: `adb devices`
- Nếu có nhiều thiết bị, chỉ định device: `adb -s <device_id> install app.apk`

### iOS (chỉ macOS)

#### Bước 1: Khởi động Metro Bundler
```bash
npm start
```

#### Bước 2: Chạy trên simulator/device
```bash
# Chạy trên iOS simulator mặc định
npm run ios

# Chạy trên iPhone 15 Pro simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# Chạy trên thiết bị thật (cần Apple Developer Account)
npx react-native run-ios --device
```

## 📦 Build APK (Android)

### Debug APK
```bash
# Build debug APK
npm run build:apk

# Hoặc thủ công
cd android
./gradlew assembleDebug
cd ..

# File APK: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (Signed)
```bash
# Build release APK đã ký
npm run build:release

# File APK: android/app/build/outputs/apk/release/app-release.apk
```

**Cấu hình signing** (trong `android/app/build.gradle`):
```gradle
signingConfigs {
    release {
        storeFile file('my-release-key.keystore')
        storePassword 'your-store-password'
        keyAlias 'my-key-alias'
        keyPassword 'your-key-password'
    }
}
```

### Cài đặt APK lên thiết bị
```bash
# Cài debug APK
npm run install:apk

# Cài release APK
npm run install:release

# Hoặc thủ công với adb
adb install -r path/to/app.apk
```

## 📖 Cách sử dụng
Ứng dụng ChatNET hoạt động theo mô hình TCP trong mạng nội bộ, không cần server trung gian:
```bash 
Thiết bị A ↔ Thiết bị B
```
### Bước 1: Chuẩn bị
Hai thiết bị Android (điện thoại hoặc emulator)

Cùng kết nối chung một mạng WiFi / hotspot

Mỗi máy cài ứng dụng ChatNET (APK vừa build)
### Bước 2: Mở Settings
1. Mở ứng dụng trên cả 2 thiết bị
2. Nhấn vào icon ⚙️ (Settings) góc phải trên cùng

### Bước 3: Cấu hình
**Thiết bị A:**
- Xem "📱 Địa chỉ IP của bạn" (ví dụ: `192.168.1.100`)
- Nhập IP của thiết bị B vào "🌐 IP người nhận"
- Cấu hình mã hóa (nếu cần):
  - Bật/tắt "🔐 Chế độ mã hóa"
  - Nhập "🔑 Key mã hóa AES" (độ dài tối thiểu 4 ký tự , ví dụ: `2025`)

**Thiết bị B:**
- Xem IP của mình
- Nhập IP của thiết bị A vào "IP người nhận"
- **Quan trọng**: Sử dụng cùng key mã hóa với thiết bị A

### Bước 4: Chat
#### Tin nhắn Text
- Nhập tin nhắn vào ô input phía dưới
- Nhấn nút gửi (icon ✉️)
- Tin nhắn sẽ được mã hóa (nếu bật) và gửi qua TCP socket

#### Gửi hình ảnh
- Nhấn 🔗 để chọn ảnh từ thư viện.
- Chọn ảnh bất kỳ
- Gửi ảnh ngay lập tức → thiết bị kia nhận và hiển thị ảnh chính xác

#### Gửi hình ảnh
- Nhấn 🔗 để chọn file từ thư mục trong điện thoại hoặc google drive
- Chọn file PDF

- Người nhận nhấn vào để mở trong FileViewer

## Kiến trúc truyền thông (Networking Overview)

TCP client & server dùng react-native-tcp-socket

Mỗi tin nhắn đóng gói thành JSON

Cuối mỗi gói có <<END>> để cắt đúng packet

Buffer nhận dữ liệu ghép theo từng chunk

## Tính năng dự kiến mở rộng

Gửi video & âm thanh

Mã hóa AES-GCM + HMAC

Nén ảnh trước khi gửi

QR Code để kết nối thiết bị

Giao diện zoom ảnh toàn màn hình

Preview PDF dạng thumbnail
