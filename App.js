import { useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import mobileAds from 'react-native-google-mobile-ads';
import { useFonts, NotoSansJP_400Regular, NotoSansJP_700Bold } from '@expo-google-fonts/noto-sans-jp';
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    NotoSansJP_400Regular,
    NotoSansJP_700Bold,
  });

  useEffect(() => {
    mobileAds()
      .initialize()
      .then((adapterStatuses) => console.log('[AdMob] initialized', adapterStatuses))
      .catch((error) => console.log('[AdMob] initialize failed', error));
  }, []);

  if (!fontsLoaded) {
    return <View />;
  }

  return <AppNavigator />;
}
