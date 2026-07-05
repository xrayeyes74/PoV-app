import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xrayeyes.pov',
  appName: 'PoV',
  webDir: 'dist',
  server: {
    url: 'https://pov.muglia.it',
    cleartext: false,
  },
};

export default config;
