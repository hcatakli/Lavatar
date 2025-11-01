const HEYGEN_API_KEY = "sk_V2_hgu_kHMUQqvhMEs_xcvTZ01cUgNS3Ro4Ml2ZE6nF9OOrHq4R";
const ELEVEN_API_KEY = "sk_3e61e52218f3f04ca17cb5d00e989a9015621ef1ed017e15";
const SPEECHACE_API_KEY = "xmKhIX9emlwdaI9jHwJW2yyv5M2%2Bgghaiip2e7Lo8vWsuCqiMkHvBa1TcNAStbA%2FniNdQkxLITdIU1ChxUkCHJvsaJToPCR4NykVT6xmrtL%2FM6sdxdidQcxpD%2B54HcuZ";

export async function listAvatars() {
  const res = await fetch("https://api.heygen.com/v2/avatars", {
    headers: {
      "X-Api-Key": HEYGEN_API_KEY,
      "Accept": "application/json"
    }
  });
  return await res.json();
}

export async function createVideo(avatarId: string, voiceId: string, text: string) {
  const res = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "X-Api-Key": HEYGEN_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: { type: "avatar", avatar_id: avatarId },
          voice: { type: "text", input_text: text, voice_id: voiceId }
        }
      ]
    })
  });
  return await res.json();
}

export async function checkVideoStatus(videoId: string) {
  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { "X-Api-Key": HEYGEN_API_KEY }
  });
  return await res.json();
}

export async function generateSpeechEleven(voiceId: string, text: string) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2"
    })
  });
  return await res.blob(); // ses dosyası (mp3)
}

export async function evaluatePronunciation(text: string, audioUri: string) {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("question_info", "'u1/q1'");
  formData.append("no_mc", "1");
  formData.append("user_audio_file", {
    uri: audioUri,
    type: "audio/wav",
    name: "audio.wav"
  } as any);

  const res = await fetch(
    `https://api5.speechace.com/api/scoring/text/v9/json?key=${SPEECHACE_API_KEY}&dialect=en-us&user_id=XYZ-ABC-99001`,
    { method: "POST", body: formData }
  );

  return await res.json();
}
