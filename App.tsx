import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  Image,
  ImageBackground,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import TcpSocket from 'react-native-tcp-socket';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
//import { encryptCaesar, decryptCaesar, isValidKey, parseKey } from './src/utils/caesarCipher';
import { encryptAES, decryptAES, isValidKey  } from "./src/utils/aesCipher";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const isSmallScreen = SCREEN_HEIGHT < 700;
const isNarrowScreen = SCREEN_WIDTH < 360;
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / 667) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const responsiveFontSize = (size: number) => {
  const scaledSize = moderateScale(size, 0.3);
  return Math.max(Math.min(scaledSize, size * 1.2), size * 0.85);
};

interface Message {
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
  encrypted?: boolean;
  type?: 'text' | 'image' | 'pdf';
}

const PORT = 8888;

function App(): React.JSX.Element {
  const [myIp, setMyIp] = useState<string>('Đang lấy IP...');
  const [targetIp, setTargetIp] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string>('3');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(true);
  const [attachmentType, setAttachmentType] = useState<'text' | 'image' | 'pdf' | null>(null);
  const serverRef = useRef<any>(null);
  const clientRef = useRef<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const encryptionKeyRef = useRef(encryptionKey);
  const isEncryptionEnabledRef = useRef(isEncryptionEnabled);

  useEffect(() => {
    encryptionKeyRef.current = encryptionKey;
  }, [encryptionKey]);

  useEffect(() => {
    isEncryptionEnabledRef.current = isEncryptionEnabled;
  }, [isEncryptionEnabled]);

  const fetchIpAddress = () => {
    setMyIp('Đang lấy IP...');
    NetInfo.fetch().then(state => {
      if (state.details && 'ipAddress' in state.details) {
        const ip = (state.details as any).ipAddress;
        setMyIp(ip || 'Không tìm thấy IP');
      } else {
        setMyIp('Không tìm thấy IP');
      }
    });
  };

  useEffect(() => {
    fetchIpAddress();
  }, []);

  useEffect(() => {
    if (!isServerRunning) {
      startServer();
    }

    return () => {
      if (serverRef.current) {
        serverRef.current.close();
      }
      if (clientRef.current) {
        clientRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startServer = () => {
    try {
      const server = TcpSocket.createServer((socket: any) => {
        // EACH socket connection has its own buffer
        let receiveBuffer = '';

        socket.on('data', (chunk: any) => {
          // append raw chunk (do NOT trim)
          const txt = chunk.toString('utf8');
          receiveBuffer += txt;

          // process while we have at least one full message (terminated by '\n')
          const DELIMITER = "<<END>>";
          let newlineIndex = receiveBuffer.indexOf(DELIMITER);

          while (newlineIndex !== -1) {
            const raw = receiveBuffer.slice(0, newlineIndex); // message JSON string
            receiveBuffer = receiveBuffer.slice(newlineIndex + DELIMITER.length); // rest

            if (raw && raw.length > 0) {
              try {
                const obj = JSON.parse(raw);
                // obj should be { type: 'text'|'image'|'pdf', content: '...' }
                const type: 'text' | 'image' | 'pdf' = obj.type || 'text';
                let content: string = obj.content ?? '';

                let finalMessage = content;
                let isEncryptedMsg = false;

                if (type === 'text') {
                  const shouldDecrypt = isEncryptionEnabledRef.current && isValidKey(encryptionKeyRef.current);
                  if (shouldDecrypt) {
                    finalMessage = decryptAES(content, encryptionKeyRef.current);
                    isEncryptedMsg = true;
                  }
                }

                setMessages(prev => [
                  ...prev,
                  {
                    text: finalMessage,
                    sender: 'other',
                    timestamp: new Date(),
                    encrypted: isEncryptedMsg,
                    type,
                  },
                ]);
              } catch (e) {
                // JSON parse failed — maybe incomplete JSON (shouldn't happen because we split on newline),
                // or corrupted. We'll ignore this chunk to avoid crash.
                // Optionally you can log or push to an error queue.
              }
            }

            // check next newline
            newlineIndex = receiveBuffer.indexOf(DELIMITER);
          }
        });

        socket.on('error', (error: any) => {
          // ignore or log
        });

        socket.on('close', () => {
          // closed
        });
      });

      server.listen({ port: PORT, host: '0.0.0.0' }, () => {
        setIsServerRunning(true);
      });

      server.on('error', (error: any) => {
        Alert.alert('Lỗi', 'Không thể khởi động server: ' + error.message);
      });

      serverRef.current = server;
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể khởi động server: ' + error.message);
    }
  };


  // simple base64/data-url checks (do NOT trim)
  const isBase64Image = (str: string) => typeof str === 'string' && str.startsWith('data:image/');
  const isBase64Pdf = (str: string) => typeof str === 'string' && str.startsWith('data:application/pdf');

  const getFileType = (str: string): 'text' | 'image' | 'pdf' => {
    if (isBase64Image(str)) return 'image';
    if (isBase64Pdf(str)) return 'pdf';
    return 'text';
  };

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false, // read using RNFS to avoid memory bloat
        quality: 0.8,
      },
      async (response) => {
        if (response.didCancel || response.errorCode) return;

        const uri = response.assets?.[0]?.uri;
        if (!uri) return;

        try {
          const base64 = await RNFS.readFile(uri, 'base64');
          const dataUrl = `data:image/jpeg;base64,${base64}`;
          sendMessage(dataUrl, 'image');
        } catch (e) {
          Alert.alert('Lỗi', 'Không thể đọc ảnh');
        }
      }
    );
  };

const pickPdf = async () => {
    try {
      // 1. CHỌN FILE
      const [file] = await pick({ type: ['application/pdf'] });

      if (!file || !file.uri) {
        // Người dùng hủy chọn
        return;
      }

      // 2. KIỂM TRA KÍCH THƯỚC (FIX: Dùng file.size thay vì RNFS.stat)
      // File Picker Result object (file) thường có thuộc tính size
      const fileSize = file.size;
      if (fileSize && fileSize > 10 * 1024 * 1024) {
        Alert.alert('Lỗi', 'File PDF quá lớn! Chọn file dưới 10MB');
        return;
      }

      // 3. XÁC ĐỊNH ĐƯỜNG DẪN AN TOÀN
      // Ưu tiên fileCopyUri (thường là path tạm thời tuyệt đối) hoặc dùng file.uri (content://)
      const filePathToRead = file.fileCopyUri || file.uri;

      // Loại bỏ tiền tố 'file://' nếu có (RNFS không thích điều này)
      const finalPath = filePathToRead.startsWith('file://') ? filePathToRead.substring(7) : filePathToRead;

      // 4. ĐỌC FILE (RNFS.readFile thường xử lý được content://)
      const base64 = await RNFS.readFile(finalPath, 'base64');

      if (!base64) {
         Alert.alert('Lỗi', 'Không thể đọc nội dung file PDF.');
         return;
      }

      const dataUrl = `data:application/pdf;base64,${base64}`;

      // 5. GỬI TIN NHẮN
      sendMessage(dataUrl, 'pdf');

    } catch (err: any) {
      if (err.message && err.message.includes('User cancelled')) {
         // Bỏ qua lỗi hủy
      } else {
        // Thông báo lỗi thân thiện hơn
        Alert.alert(
          'Lỗi Đọc File',
          'Xảy ra lỗi khi cố gắng đọc file PDF (Native Error). Vui lòng thử lại với file khác, hoặc đảm bảo ứng dụng có đủ quyền truy cập bộ nhớ.',
        );
        console.error('PDF PICKER/RNFS ERROR:', err);
      }
    }
  };

  const openPdf = async (base64Data: string) => {
    try {
      const base64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
      const path = `${RNFS.CachesDirectoryPath}/chatnet_${Date.now()}.pdf`;
      await RNFS.writeFile(path, base64, 'base64');
      await FileViewer.open(path);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở file PDF');
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert('Gửi tệp', 'Chọn loại bạn muốn gửi', [
      { text: 'Ảnh từ thư viện', onPress: pickImage },
      { text: 'File PDF', onPress: pickPdf },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const sendMessage = (content?: string | any, explicitType?: 'image' | 'pdf') => {
    const msgToSend = (typeof content === 'string' ? content : message) || '';
    const currentType = explicitType || attachmentType || (isBase64Image(msgToSend) ? 'image' : isBase64Pdf(msgToSend) ? 'pdf' : 'text');
    const isFile = currentType === 'image' || currentType === 'pdf';

    // validation
    if (!msgToSend && !isFile) {
      Alert.alert('Thông báo', 'Vui lòng nhập tin nhắn');
      return;
    }

    if (!targetIp.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập IP đối phương trong Settings');
      return;
    }

    if (!isFile && isEncryptionEnabled && !isValidKey(encryptionKey)) {
      Alert.alert('Lỗi mã hóa', 'Key phải là chuỗi có độ dài lớn hơn 4.');
      return;
    }

    // prepare content: for text, trim; for files keep as-is (base64)
    const contentToSend = isFile ? msgToSend : msgToSend.trim();

    // encrypt only for text (if enabled)
    const payloadContent = (!isFile && isEncryptionEnabled)
      ? encryptAES(contentToSend, encryptionKey)
      : contentToSend;

    // construct JSON message
    const msgObj = {
      type: currentType,
      content: payloadContent,
    };

    const DELIMITER = "<<END>>";
    const jsonString = JSON.stringify(msgObj) + DELIMITER;


    setMessage('');
    setAttachmentType(null);
    scrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      let connectionTimeout: any;
      let isConnected = false;

      const client = TcpSocket.createConnection(
        {
          port: PORT,
          host: targetIp,
        },
        () => {
          isConnected = true;
          clearTimeout(connectionTimeout);

          // write single JSON message (one write; payload may be large but socket will fragment — receiver will reassemble)
          client.write(jsonString, 'utf8', (error) => {
            if (error) {
              Alert.alert('Lỗi', 'Không thể gửi tin nhắn: ' + error.message);
            } else {
              // show in local UI (display original - not encrypted for user)
              setMessages(prev => [
                ...prev,
                {
                  text: contentToSend,
                  sender: 'me',
                  timestamp: new Date(),
                  encrypted: !isFile && isEncryptionEnabled,
                  type: currentType,
                },
              ]);
            }

            setTimeout(() => {
              client.destroy();
            }, 100);
          });
        }
      );

      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          client.destroy();
          Alert.alert(
            'Lỗi kết nối',
            `Không thể kết nối đến ${targetIp}\n\nKiểm tra:\n• IP có đúng không?\n• Thiết bị có cùng WiFi không?\n• Ứng dụng đã mở ở thiết bị kia chưa?`
          );
        }
      }, 5000);

      client.on('error', (error: any) => {
        clearTimeout(connectionTimeout);

        let errorMessage = 'Không thể kết nối đến ' + targetIp;
        const errMsg = error?.message || '';

        if (errMsg.includes('ECONNREFUSED')) {
          errorMessage += '\n\n❌ Kết nối bị từ chối!\nỨng dụng chưa được mở ở thiết bị đích.';
        } else if (errMsg.includes('ETIMEDOUT') || errMsg.includes('timeout')) {
          errorMessage += '\n\n⏱️ Hết thời gian chờ!\nKiểm tra kết nối mạng và IP.';
        } else if (errMsg.includes('ENETUNREACH') || errMsg.includes('EHOSTUNREACH')) {
          errorMessage += '\n\n🌐 Không thể truy cập mạng!\nKiểm tra cả 2 thiết bị có cùng WiFi.';
        } else if (errMsg) {
          errorMessage += '\n\n' + errMsg;
        }

        Alert.alert('Lỗi kết nối', errorMessage);
      });

      client.on('close', () => {
        clearTimeout(connectionTimeout);
      });

      clientRef.current = client;
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn: ' + error.message);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0084ff" />
      <ImageBackground
        source={require('./assets/Logo.jpg')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>💬 ChatNET</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettingsModal(true)}
              activeOpacity={0.7}
            >
              <Image
                source={require('./assets/setting.png')}
                style={styles.settingsIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >

            {/* Settings Modal */}
            <Modal
              visible={showSettingsModal}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowSettingsModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>⚙️ Cài đặt</Text>
                    <TouchableOpacity
                      onPress={() => setShowSettingsModal(false)}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    {/* My IP */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>📱 Địa chỉ IP của bạn</Text>
                      <View style={styles.ipDisplayRow}>
                        <Text style={styles.ipDisplayText}>{myIp}</Text>
                        <TouchableOpacity
                          style={styles.reloadButton}
                          onPress={fetchIpAddress}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.reloadIcon}>↻</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Target IP */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>🌐 IP người nhận</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={targetIp}
                        onChangeText={setTargetIp}
                        placeholder="Nhập IP (ví dụ: 192.168.1.100)"
                        placeholderTextColor="#aaa"
                        keyboardType="numeric"
                      />
                    </View>

                    {/* Encryption Toggle */}
                    <View style={styles.modalSection}>
                      <View style={styles.toggleRow}>
                        <View style={styles.toggleLabelContainer}>
                          <Text style={styles.modalLabel}>🔐 Chế độ mã hóa</Text>
                          <Text style={styles.toggleSubLabel}>
                            {isEncryptionEnabled ? 'Đang bật' : 'Đang tắt'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            isEncryptionEnabled ? styles.toggleButtonOn : styles.toggleButtonOff
                          ]}
                          onPress={() => setIsEncryptionEnabled(!isEncryptionEnabled)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.toggleCircle,
                            isEncryptionEnabled ? styles.toggleCircleOn : styles.toggleCircleOff
                          ]} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Encryption Key - Only show when encryption is enabled */}
                    {isEncryptionEnabled && (
                      <View style={styles.modalSection}>
                        <Text style={styles.modalLabel}>🔑 Key mã hóa (chuỗi bất kỳ độ dài lớn hơn 4.)</Text>
                        <TextInput
                          style={styles.modalInput}
                          value={encryptionKey}
                          onChangeText={setEncryptionKey}
                          placeholder="3"
                          placeholderTextColor="#aaa"


                        />
                        <View style={styles.infoBox}>
                          <Text style={styles.infoIcon}>ℹ️</Text>
                          <Text style={styles.infoText}>
                            Cả 2 người phải dùng cùng key để chat được với nhau.
                          </Text>
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={() => setShowSettingsModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.saveButtonText}>✓ Lưu cài đặt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Messages Area */}
            <View style={styles.chatArea}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Vui lòng cài đặt trước khi trò chuyện</Text>
                  </View>
                ) : (
                  messages.map((msg, index) => (
                    <View
                      key={index}
                      style={[
                        styles.messageRow,
                        msg.sender === 'me' ? styles.myMessageRow : styles.otherMessageRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          msg.sender === 'me' ? styles.myMessage : styles.otherMessage,
                        ]}
                      >
                        {msg.type === 'image' ? (
                          <Image
                            source={{ uri: msg.text }}
                            style={styles.messageImage}
                            resizeMode="contain"
                          />
                        ) : msg.type === 'pdf' ? (
                          <TouchableOpacity
                            style={styles.pdfContainer}
                            onPress={() => openPdf(msg.text)}
                          >
                            <Text style={styles.pdfIcon}>PDF</Text>
                            <Text style={styles.pdfText}>File PDF • Nhấn để mở</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text
                            style={[
                              styles.messageText,
                              msg.sender === 'me' ? styles.myMessageText : styles.otherMessageText,
                            ]}
                          >
                            {msg.text}
                          </Text>
                        )}
                        <Text style={[
                          styles.timestamp,
                          msg.sender === 'me' ? styles.myTimestamp : styles.otherTimestamp,
                        ]}>
                          {msg.timestamp.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Message Input */}
            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={showAttachmentOptions}
                activeOpacity={0.7}
              >
                <Image
                  source={require('./assets/attach.png')}
                  style={styles.attachIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                onPress={() => sendMessage(undefined, undefined)}
                activeOpacity={0.7}
                disabled={!message.trim()}
              >
                <Image
                  source={require('./assets/send-message.png')}
                  style={styles.sendIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  backgroundImageStyle: {
    opacity: 0.50,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0084ff',
    paddingHorizontal: scale(15),
    paddingTop: Platform.OS === 'ios' ? verticalScale(20) : verticalScale(45),
    paddingBottom: verticalScale(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveFontSize(24),
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  settingsButton: {
    padding: scale(8),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsIcon: {
    width: moderateScale(26),
    height: moderateScale(26),
    tintColor: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(20),
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: scale(5),
  },
  closeButtonText: {
    fontSize: responsiveFontSize(24),
    color: '#666',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: moderateScale(20),
  },
  modalSection: {
    marginBottom: verticalScale(20),
  },
  modalLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: verticalScale(8),
  },
  ipDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: moderateScale(12),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ipDisplayText: {
    flex: 1,
    fontSize: responsiveFontSize(15),
    fontWeight: '600',
    color: '#0084ff',
  },
  reloadButton: {
    backgroundColor: '#0084ff',
    borderRadius: moderateScale(17),
    width: moderateScale(34),
    height: moderateScale(34),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: scale(10),
  },
  reloadIcon: {
    fontSize: responsiveFontSize(20),
    color: '#fff',
    fontWeight: 'bold',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: moderateScale(10),
    padding: moderateScale(14),
    fontSize: responsiveFontSize(15),
    color: '#333',
    backgroundColor: '#fafafa',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: moderateScale(12),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(8),
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  infoIcon: {
    fontSize: responsiveFontSize(18),
    marginRight: scale(8),
  },
  infoText: {
    flex: 1,
    fontSize: responsiveFontSize(12),
    color: '#1565C0',
    lineHeight: responsiveFontSize(18),
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: moderateScale(16),
    margin: moderateScale(20),
    marginTop: 0,
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: responsiveFontSize(16),
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelContainer: {
    flex: 1,
  },
  toggleSubLabel: {
    fontSize: responsiveFontSize(12),
    color: '#666',
    marginTop: verticalScale(2),
  },
  toggleButton: {
    width: moderateScale(56),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    padding: scale(2),
    justifyContent: 'center',
  },
  toggleButtonOn: {
    backgroundColor: '#4CAF50',
    alignItems: 'flex-end',
  },
  toggleButtonOff: {
    backgroundColor: '#ccc',
    alignItems: 'flex-start',
  },
  toggleCircle: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  toggleCircleOn: {
  },
  toggleCircleOff: {
  },
  chatArea: {
    flex: 1,
    backgroundColor: 'rgba(240, 242, 245, 0.85)',
    marginBottom: 0,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: moderateScale(14),
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(50),
    paddingHorizontal: scale(20),
  },
  emptyText: {
    fontSize: responsiveFontSize(15),
    color: '#888',
    textAlign: 'center',
    lineHeight: responsiveFontSize(20),
  },
  messageRow: {
    marginVertical: verticalScale(4),
  },
  myMessageRow: {
    alignItems: 'flex-end',
  },
  otherMessageRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    padding: moderateScale(12),
    borderRadius: moderateScale(16),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.5,
  },
  myMessage: {
    backgroundColor: '#0084ff',
    borderBottomRightRadius: moderateScale(4),
  },
  otherMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: moderateScale(4),
  },
  messageText: {
    fontSize: responsiveFontSize(15),
    marginBottom: verticalScale(3),
    lineHeight: responsiveFontSize(20),
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#000',
  },
  timestamp: {
    fontSize: responsiveFontSize(11),
    alignSelf: 'flex-end',
    marginTop: verticalScale(2),
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherTimestamp: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: moderateScale(14),
    paddingBottom: verticalScale(24),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 0,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d0d0d0',
    borderRadius: moderateScale(25),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    fontSize: responsiveFontSize(15),
    maxHeight: verticalScale(100),
    color: '#333',
    marginRight: scale(10),
    backgroundColor: '#fafafa',
  },
  sendButton: {
    backgroundColor: 'transparent',
    width: moderateScale(25),
    height: moderateScale(25),
    borderRadius: moderateScale(13),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    width: moderateScale(25),
    height: moderateScale(25),
  },
  attachButton: { padding: 10 },
  attachIcon: { width: 26, height: 26, tintColor: '#0084ff' },
  messageImage: { width: SCREEN_WIDTH * 0.7, height: SCREEN_WIDTH * 0.7 * 1.3, borderRadius: 16, marginVertical: 6 },
  pdfContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#ffcdd2' },
  pdfIcon: { fontSize: 32, marginRight: 12 },
  pdfText: { color: '#c62828', fontWeight: '600' },
});

export default App;
