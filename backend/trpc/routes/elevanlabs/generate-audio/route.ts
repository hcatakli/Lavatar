import { z } from "zod";
import { publicProcedure } from "../../../create-context";
/* eslint-disable import/no-unresolved */
import { SPEECHACE_API_KEY, ELEVEN_API_KEY, HEYGEN_API_KEY } from '@env';



export default publicProcedure
  .input(
    z.object({
      text: z.string(),
      voiceId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${input.voiceId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: input.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error:", errorText);
      throw new Error(`Failed to generate audio: ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    console.log(`Generated audio for voice: ${input.voiceId}, text length: ${input.text.length}`);

    return {
      audioBase64: base64Audio,
      mimeType: "audio/mpeg",
    };
  });
