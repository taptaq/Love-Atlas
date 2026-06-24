import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleAiJourneyApi } from './src/server/aiJourneyService';
import { handleAiRouteApi } from './src/server/aiRouteService';
import { handleAiVisionApi } from './src/server/aiVisionService';
import { loadServerEnv } from './src/server/env';
import { handleSessionApi } from './src/server/sessionApi';
import { handleSpaceApi } from './src/server/spaceApi';

loadServerEnv();

function relationshipOsApi(): Plugin {
  return {
    name: 'relationship-os-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const handled = (await handleAiRouteApi(request, response)) || (await handleAiVisionApi(request, response)) || (await handleAiJourneyApi(request, response)) || (await handleSpaceApi(request, response)) || (await handleSessionApi(request, response));
        if (!handled) next();
      });
    },
  };
}

export default defineConfig({
  plugins: [relationshipOsApi(), react()],
  server: {
    host: true,
  },
});
