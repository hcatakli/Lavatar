/* eslint-disable import/no-unresolved */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator, 
} from 'react-native';
import { Stack } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Mic,
  Volume2,
  User,
  SkipForward,
} from 'lucide-react-native';
import { Audio, Video, ResizeMode } from 'expo-av';
import Colors from '../constants/color';
import { practiceWords } from '@/data/words';
import { voiceOptions } from '@/data/voices';
import { PronunciationResult } from '@/types/word';
import { trpc } from '../lib/trpc';
import * as FileSystem from 'expo-file-system/legacy';
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import defaultVideo from '../assets/video_start.mp4'; // import ile alın'
import { SPEECHACE_API_KEY, ELEVEN_API_KEY, HEYGEN_API_KEY } from '@env';


const HEYGEN_BASE_URL = "https://api.heygen.com";
const HEYGEN_HEADERS = {
  "X-Api-Key": HEYGEN_API_KEY,
  "Content-Type": "application/json",
  "Accept": "application/json",
};


let videoCounter = 0;

export default function PracticeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // const [pronunciationResult, setPronunciationResult] =
  //   useState<PronunciationResult>({ score: 0, status: 'pending' });
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);

  const [videoMap, setVideoMap] = useState<{ [word: string]: string }>({});
  const [pronunciationResult, setPronunciationResult] = useState<{
  score: number;
  status: "pending" | "excellent" | "good" | "needsWork";
  }>({
    score: 0,
    status: "pending",
  });


  const videoCache = useRef<Map<string, string>>(new Map());
  
  const currentWord = practiceWords[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < practiceWords.length - 1;
  

  const handlePrevious = useCallback(() => {
    if (canGoPrevious) {
      setCurrentIndex(currentIndex - 1);
      setPronunciationResult({ score: 0, status: 'pending' });
    }
  }, [currentIndex, canGoPrevious]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
      setPronunciationResult({ score: 0, status: 'pending' });
    }
  }, [currentIndex, canGoNext]);

  const handleSkip = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(currentIndex + 1);
      setPronunciationResult({ score: 0, status: 'pending' });
    }
  }, [currentIndex, canGoNext]);

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
  if (!recording) return;

  setIsRecording(false);
  await recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = recording.getURI();
  setRecording(null);
  if (!uri) return;

  try {
    // FormData oluştur
    const formData = new FormData();
    formData.append("text", currentWord.text);
    formData.append("question_info", "'u1/q1'");
    formData.append("no_mc", "1");

    // Audio dosyasını URI üzerinden gönder
    const audioFile: any = {
      uri, // Expo Audio URI
      type: "audio/wav",
      name: "audio.wav",
    };
    formData.append("user_audio_file", audioFile);

    // SpeechAce API çağrısı
    const response = await fetch(
      `https://api5.speechace.com/api/scoring/text/v9/json?key=${SPEECHACE_API_KEY}&dialect=en-us&user_id=XYZ-ABC-99001`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    console.log("SpeechAce result:", result);

    // Kelime bazlı puan ve ortalama
    const wordScores = result.text_score?.word_score_list || [];
    const averageScore =
      wordScores.length > 0
        ? Math.round(
            wordScores.reduce(
              (sum: number, w: any) => sum + (w.quality_score || 0),
              0
            ) / wordScores.length
          )
        : 0;

    setPronunciationResult({
      score: averageScore,
      status:
        averageScore >= 85
          ? "excellent"
          : averageScore >= 70
          ? "good"
          : "needsWork",
    });
  } catch (err) {
    console.error("Error sending audio to SpeechAce:", err);
  }
};

    const handleRecordPress = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };


    // ELEVANLABS 
  const playVoiceSample = async (voiceId: string, text: string) => {
    try {
      setSelectedVoice(voiceId);
      setIsPlayingVoice(true);

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVEN_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      // 1️⃣ ReadableStream → ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();

      // 2️⃣ ArrayBuffer → Uint8Array
      const uint8Array = new Uint8Array(arrayBuffer);

      // 3️⃣ Base64
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const audioBase64 = btoa(binary);

      // 4️⃣ Dosya yaz
      const fileUri = `${FileSystem.cacheDirectory}${voiceId}_${text}.mp3`;
      await FileSystem.writeAsStringAsync(fileUri, audioBase64, { encoding: FileSystem.EncodingType.Base64 });

      // 5️⃣ Oynat
      const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setIsPlayingVoice(false);
          setSelectedVoice(null);
        }
      });

    } catch (err) {
      console.error("Error playing ElevenLabs TTS:", err);
      setIsPlayingVoice(false);
      setSelectedVoice(null);
    }
  };


  // HEYGEN
  // 3️⃣ Video durumunu kontrol et ve URI dön
  
useEffect(() => {
    if (!currentWord) return;

    if (videoCache.current.has(currentWord.text)) {
      const cachedUri = videoCache.current.get(currentWord.text)!;
      setVideoUri(cachedUri);
    } else {
      setVideoUri(null); // Video yoksa placeholder veya default video
    }
  }, [currentWord]);

  const createAvatarVideo = async (avatarId: string, voiceId: string, text: string) => {
    try {
      setIsLoadingAvatar(true);

      // Cache varsa direkt döndür
      if (videoCache.current.has(text)) {
        const cachedUri = videoCache.current.get(text)!;
        setVideoUri(cachedUri);
        setIsLoadingAvatar(false);
        return cachedUri;
      }

      console.log(`🎬 Video oluşturma isteği gönderiliyor: "${text}"`);
      const resp = await fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
        method: 'POST',
        headers: HEYGEN_HEADERS,
        body: JSON.stringify({
          video_inputs: [
            {
              character: { type: 'avatar', avatar_id: avatarId, avatar_style: 'normal' },
              voice: { type: 'text', input_text: text, voice_id: voiceId, speed: 1.0 },
            },
          ],
          dimension: { width: 1280, height: 720 },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(data));

      const videoId = data?.data?.video_id;
      if (!videoId) throw new Error('Video ID alınamadı.');
      console.log(`✅ Video ID alındı: ${videoId}`);

      const finalVideoUri = await waitForVideo(videoId, text);
      if (finalVideoUri) {
        videoCache.current.set(text, finalVideoUri);
        setVideoUri(finalVideoUri);
      }

      setIsLoadingAvatar(false);
      return finalVideoUri;
    } catch (err) {
      console.error('Heygen video hatası:', err);
      setIsLoadingAvatar(false);
      Alert.alert('Hata', 'Avatar videosu oluşturulamadı.');
      return null;
    }
  };

  const waitForVideo = async (videoId: string, text: string) => {
    let status = 'waiting';
    let attempt = 0;

    while (status === 'waiting' || status === 'processing') {
      attempt++;
      const resp = await fetch(`${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`, {
        headers: HEYGEN_HEADERS,
      });
      const data = await resp.json();
      status = data?.data?.status ?? 'unknown';
      const videoUrl = data?.data?.video_url;

      console.log(`🔄 [Attempt ${attempt}] Status: ${status}, video_url: ${videoUrl}`);

      if (status === 'completed' && videoUrl) {
        videoCounter++;
        const fileUri = `${FileSystem.cacheDirectory}video_${videoCounter}_${text}.mp4`;
        console.log(`⬇️ Video indiriliyor: ${fileUri}`);

        const downloadResult = await FileSystem.downloadAsync(videoUrl, fileUri);
        console.log(`✅ Video başarıyla indirildi: ${downloadResult.uri}`);
        return downloadResult.uri;
      } else if (status === 'failed') {
        console.error('Video oluşturma başarısız oldu:', data?.error);
        return null;
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    console.error('Video tamamlanamadı.');
    return null;
  };

  // Speak Word butonuna basıldığında video oluştur
  const handleSpeakAvatar = async () => {
    if (!currentWord) return;

    const avatarId = 'Abigail_expressive_2024112501';
    const voiceId = 'cef3bc4e0a84424cafcde6f2cf466c97';

    setIsLoadingAvatar(true);
    await createAvatarVideo(avatarId, voiceId, currentWord.text);
    setIsLoadingAvatar(false);
  };
  
  const getScoreColor = () => {
  if (!pronunciationResult || pronunciationResult.status === "pending") return "#333"; // varsayılan renk
  switch (pronunciationResult.status) {
    case "excellent":
      return "green";
    case "good":
      return "orange";
    case "needsWork":
      return "red";
    default:
      return "#333";
  }
};

const getStatusText = () => {
  if (!pronunciationResult) return "";
  switch (pronunciationResult.status) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "needsWork":
      return "Needs Work";
    case "pending":
      return "Pending...";
    default:
      return "";
  }
};

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Pronunciation Practice',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.white,
          headerTitleStyle: { fontWeight: '600' as const },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentIndex + 1) / practiceWords.length) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentIndex + 1} of {practiceWords.length}
          </Text>
        </View>

  <View style={styles.avatarSection}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <User size={20} color={Colors.text} />
        <Text style={styles.sectionTitle}>Professional English Tutor Abigail</Text>
      </View>

      {/* Speak Word Butonu */}
      <TouchableOpacity
        style={[styles.avatarButton, isLoadingAvatar && styles.avatarButtonLoading]}
        onPress={handleSpeakAvatar}
        activeOpacity={0.7}
        disabled={isLoadingAvatar}
      >
        <Volume2 size={20} color={isLoadingAvatar ? Colors.textTertiary : Colors.white} />
        <Text style={[styles.avatarButtonText, isLoadingAvatar && styles.avatarButtonTextLoading]}>
          {isLoadingAvatar ? 'Generating...' : 'Speak Word'}
        </Text>
        {isLoadingAvatar && <ActivityIndicator color={Colors.white} style={{ marginLeft: 8 }} />}
      </TouchableOpacity>

      {/* Video veya Avatar */}
 <View style={styles.avatarCard}>
  <Video
    source={videoUri ? { uri: videoUri } : defaultVideo} // <- dikkat
    style={{ width: 300, height: 200, marginTop: 10, borderRadius: 12 }}
    shouldPlay={!isLoadingAvatar}
    useNativeControls
    resizeMode="cover" // string olmalı
  />
</View>
    </View>
  



        <View style={styles.wordCard}>
  <View style={styles.difficultyBadge}>
    <Text style={styles.difficultyText}>
      {currentWord.difficulty.toUpperCase()}
    </Text>
  </View>

  {/* 🔥 Renk dinamik hale getirildi */}
  <Text style={[styles.wordText, { color: getScoreColor() }]}>
    {currentWord.text}
  </Text>

  <Text style={styles.definitionText}>{currentWord.definition}</Text>
</View>


        <View style={styles.recordSection}>
          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}
            onPress={handleRecordPress}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.recordIconContainer,
                isRecording && styles.recordIconContainerActive,
              ]}
            >
              <Mic
                size={32}
                color={isRecording ? Colors.white : Colors.primary}
              />
            </View>
          </TouchableOpacity>

        </View>

        <View style={styles.voicesSection}>
          <View style={styles.sectionHeader}>
            <Volume2 size={20} color={Colors.text} />
            <Text style={styles.sectionTitle}>Listen to pronunciations</Text>
          </View>

          <View style={styles.voiceGrid}>
            {voiceOptions.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                style={[
                  styles.voiceButton,
                  selectedVoice === voice.voiceId &&
                    isPlayingVoice &&
                    styles.voiceButtonActive,
                ]}
                onPress={() => playVoiceSample(voice.voiceId, currentWord.text)}
                activeOpacity={0.7}
              >
                <View style={styles.voiceIcon}>
                  <User size={20} color={Colors.primary} />
                </View>
                <Text style={styles.voiceName}>{voice.name}</Text>
                <Text style={styles.voiceGender}>
                  {voice.gender === "male" ? "♂" : "♀"}
                </Text>
                {selectedVoice === voice.voiceId && isPlayingVoice && (
                  <View style={styles.playingIndicator}>
                    <View style={styles.playingDot} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, !canGoPrevious && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={!canGoPrevious}
          activeOpacity={0.7}
        >
          <ChevronLeft
            size={24}
            color={canGoPrevious ? Colors.primary : Colors.textTertiary}
          />
          <Text
            style={[
              styles.navButtonText,
              !canGoPrevious && styles.navButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={!canGoNext}
          activeOpacity={0.7}
        >
          <SkipForward
            size={20}
            color={canGoNext ? Colors.textSecondary : Colors.textTertiary}
          />
          <Text
            style={[
              styles.skipButtonText,
              !canGoNext && styles.navButtonTextDisabled,
            ]}
          >
            Skip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={!canGoNext}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navButtonText,
              !canGoNext && styles.navButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <ChevronRight
            size={24}
            color={canGoNext ? Colors.primary : Colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  wordCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  difficultyBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  wordText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  definitionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  recordSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  recordButton: {
    marginBottom: 20,
  },
  recordButtonActive: {},
  recordIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconContainerActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  resultContainer: {
    alignItems: 'center',
    minHeight: 60,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  voicesSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  voiceButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  voiceButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  voiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  voiceName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  voiceGender: {
    fontSize: 18,
    color: Colors.textTertiary,
  },
  playingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  avatarSection: {
    marginBottom: 24,
  },
  avatarCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  avatarTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  avatarSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  avatarButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarButtonLoading: {
    backgroundColor: Colors.surfaceAlt,
  },
  avatarButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  avatarButtonTextLoading: {
    color: Colors.textTertiary,
  },
  navigationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  navButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
});
