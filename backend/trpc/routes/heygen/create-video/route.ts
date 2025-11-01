import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

/* eslint-disable import/no-unresolved */
import { SPEECHACE_API_KEY, ELEVEN_API_KEY, HEYGEN_API_KEY } from '@env';
const HEYGEN_BASE_URL = "https://api.heygen.com";

export default publicProcedure
  .input(
    z.object({
      avatarId: z.string(),
      voiceId: z.string(),
      text: z.string(),
      speed: z.number().optional().default(1.0),
    })
  )
  .mutation(async ({ input }) => {
    const url = `${HEYGEN_BASE_URL}/v2/video/generate`;
    const payload = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: input.avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: input.text,
            voice_id: input.voiceId,
            speed: input.speed,
          },
        },
      ],
      dimension: { width: 1280, height: 720 },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HeyGen API Error:", errorText);
      throw new Error(`Failed to create video: ${errorText}`);
    }

    const data = await response.json();
    const videoId = data.data?.video_id;

    if (!videoId) {
      throw new Error("No video ID returned from API");
    }

    console.log("Video creation initiated:", videoId);
    return { videoId };
  });
