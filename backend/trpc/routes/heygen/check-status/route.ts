import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";
/* eslint-disable import/no-unresolved */
import { SPEECHACE_API_KEY, ELEVEN_API_KEY, HEYGEN_API_KEY } from '@env';

const HEYGEN_BASE_URL = "https://api.heygen.com";

export default publicProcedure
  .input(
    z.object({
      videoId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const url = `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${input.videoId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Api-Key": HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("HeyGen Status Check Error:", errorText);
      throw new Error(`Failed to check video status: ${errorText}`);
    }

    const data = await response.json();
    const status = data.data?.status || "unknown";
    const videoUrl = data.data?.video_url;
    const error = data.error;

    console.log(`Video ${input.videoId} status:`, status);

    return {
      status,
      videoUrl,
      error,
    };
  });
