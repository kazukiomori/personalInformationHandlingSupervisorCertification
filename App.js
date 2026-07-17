import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import mobileAds from 'react-native-google-mobile-ads';
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  useEffect(() => {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => console.log('[AdMob] initialized', adapterStatuses))
      .catch((error) => console.log('[AdMob] initialize failed', error));
  }, []);

  return <AppNavigator />;
}
