import { createTRPCRouter } from "../trpc/create-context";
import hiRoute from "../trpc/routes/example/hi/route";
import createVideoRoute from "./routes/heygen/create-video/route";
import checkStatusRoute from "./routes/heygen/check-status/route";
import evaluateRoute from "./routes/speechace/evulate/route";
import generateAudioRoute from "./routes/elevanlabs/generate-audio/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  heygen: createTRPCRouter({
    createVideo: createVideoRoute,
    checkStatus: checkStatusRoute,
  }),
  speechace: createTRPCRouter({
    evaluate: evaluateRoute,
  }),
  elevenlabs: createTRPCRouter({
    generateAudio: generateAudioRoute,
  }),
});

export type AppRouter = typeof appRouter;
