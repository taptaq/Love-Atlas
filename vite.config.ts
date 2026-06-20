import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleAiRouteApi } from './src/server/aiRouteService';
import { handleSessionApi } from './src/server/sessionApi';
import { handleSpaceApi } from './src/server/spaceApi';

function relationshipOsApi(): Plugin {
  return {
    name: 'relationship-os-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const handled = (await handleAiRouteApi(request, response)) || (await handleSpaceApi(request, response)) || (await handleSessionApi(request, response));
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
