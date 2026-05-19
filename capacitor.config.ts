import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'recipe-share',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      // Native splash is hidden manually from AppComponent the moment Angular
      // bootstraps; the in-app <app-boot-splash> Lottie animation takes over.
      // Background matches boot-splash.component.scss so handoff has no flash.
      launchShowDuration: 0,
      backgroundColor: '#FBF6EE',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
