import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useIAP } from 'react-native-iap';
import { PREMIUM_PRODUCT_ID, loadIsPremiumUnlocked, saveIsPremiumUnlocked } from '../utils/purchases';

const PurchaseContext = createContext({
  isPremium: false,
  refreshPremiumStatus: () => Promise.resolve(),
});

// アプリ全体の購入状態(isPremium)を一箇所で保持する。
// 起動直後はAsyncStorageのキャッシュ値を即座に反映してUIをブロックせず、
// 裏でストアへ再確認(restorePurchases)して所有が確認できれば静かに更新する。
// ストア確認が失敗・タイムアウトしてもエラー表示はせず、キャッシュ値のまま維持する
// (所有情報は真にする方向にのみ上書きし、誤ってfalseへ戻すことはしない)。
export const PurchaseProvider = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);

  const refreshPremiumStatus = useCallback(() => {
    return loadIsPremiumUnlocked().then(setIsPremium);
  }, []);

  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const { connected, availablePurchases, restorePurchases } = useIAP();

  useEffect(() => {
    if (!connected) return;
    // タイムアウトは設けない(結果を待ってUIを変える処理ではないため)。
    // 失敗・オフラインは無音で無視し、キャッシュ値のまま維持する。
    restorePurchases().catch(() => {});
  }, [connected, restorePurchases]);

  useEffect(() => {
    // 'pending'(Ask to Buyの承認待ち・支払い確認待ちなど)の取引は所有とみなさない。
    // purchaseStateがpurchasedのものだけを「所有済み」として扱う。
    const owned = availablePurchases.some(
      (p) => p.id === PREMIUM_PRODUCT_ID && p.purchaseState === 'purchased'
    );
    if (owned) {
      setIsPremium(true);
      saveIsPremiumUnlocked(true);
    }
  }, [availablePurchases]);

  return (
    <PurchaseContext.Provider value={{ isPremium, refreshPremiumStatus }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchaseStatus = () => useContext(PurchaseContext);
