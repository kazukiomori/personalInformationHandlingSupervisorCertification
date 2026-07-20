import AsyncStorage from '@react-native-async-storage/async-storage';

// プレミアム機能(模擬試験・学習履歴/進捗・ブックマーク復習)を解放する買い切り商品。
// 実際の商品(価格・商品ID登録)はApp Store Connect / Google Play Consoleで、
// この文字列と同じ商品IDで作成する必要がある。
export const PREMIUM_PRODUCT_ID = "premium_unlock";

export const PREMIUM_STORAGE_KEY = "isPremiumUnlocked";

// 購入状態はストアへ毎回問い合わせず、AsyncStorageにキャッシュした値を使う。
// 実際の購入・復元処理はsrc/screens/Premium.js(react-native-iapのuseIAPフック)で行い、
// 成功時にこのヘルパーで書き込む。
export const loadIsPremiumUnlocked = async () => {
  const stored = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
  return stored === "true";
};

export const saveIsPremiumUnlocked = async (value) => {
  await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, value ? "true" : "false");
};
