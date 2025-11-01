import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

/* eslint-disable import/no-unresolved */
import { SPEECHACE_API_KEY, ELEVEN_API_KEY, HEYGEN_API_KEY } from '@env';
const SPEECHACE_BASE_URL = `https://api5.speechace.com/api/scoring/text/v9/json?key=${SPEECHACE_API_KEY}&dialect=en-us&user_id=XYZ-ABC-99001`;

export default publicProcedure
  .input(
    z.object({
      text: z.string(),
      audioBase64: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const audioBuffer = Buffer.from(input.audioBase64, "base64");

    const formData = new FormData();
    formData.append("text", input.text);
    formData.append("question_info", "'u1/q1'");
    formData.append("no_mc", "1");

    const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
    formData.append("user_audio_file", audioBlob, "audio.wav");

    const response = await fetch(SPEECHACE_BASE_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SpeechAce API Error:", errorText);
      throw new Error(`Failed to evaluate pronunciation: ${errorText}`);
    }

    const result = await response.json();
    console.log("SpeechAce evaluation result:", JSON.stringify(result, null, 2));

    const wordScores =
      result.text_score?.word_score_list?.map((w: any) => ({
        word: w.word || "",
        score: w.quality_score || 0,
        status:
          (w.quality_score || 0) >= 80
            ? "excellent"
            : (w.quality_score || 0) >= 70
            ? "good"
            : "needsWork",
      })) || [];

    const averageScore =
      wordScores.length > 0
        ? Math.round(
            wordScores.reduce((sum: number, w: any) => sum + w.score, 0) /
              wordScores.length
          )
        : 0;

    return {
      averageScore,
      wordScores,
      rawResult: result,
    };
  });
