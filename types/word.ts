export interface Word {
  id: string;
  text: string;
  definition: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PronunciationResult {
  score: number;
  status: 'excellent' | 'good' | 'needsWork' | 'pending';
  wordScores?: {
    word: string;
    score: number;
  }[];
}

export interface VoiceOption {
  id: string;
  name: string;
  voiceId: string;
  gender: 'male' | 'female';
}
