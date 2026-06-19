import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { handleSessionApi } from './src/server/sessionApi';
import { handleSpaceApi } from './src/server/spaceApi';

function relationshipOsApi(): Plugin {
  return {
    name: 'relationship-os-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const handled = (await handleSpaceApi(request, response)) || (await handleSessionApi(request, response));
        if (!handled) next();
      });
    },
  };
}

export default defineConfig({
  plugins: [relationshipOsApi(), react()],
});
