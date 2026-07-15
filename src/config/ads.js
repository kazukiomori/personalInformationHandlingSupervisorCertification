import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// TODO: AdMobコンソールでこのアプリ用のiOS/Androidアプリ登録・バナー広告ユニットを
// 作成したら、下記のTestIds.BANNERを実際の広告ユニットIDに差し替える。
// (App.jsonのandroidAppId/iosAppIdも合わせて本番のApp IDに差し替えること)
export const BANNER_AD_UNIT_ID = Platform.select({
  ios: TestIds.BANNER,
  android: TestIds.BANNER,
  default: TestIds.BANNER,
});
