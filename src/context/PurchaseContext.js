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

  const { connected, availablePurchases, getAvailablePurchases, finishTransaction } = useIAP();

  useEffect(() => {
    if (!connected) return;
    // restorePurchases()はiOSでsyncIOS(AppStore.sync())を呼び、Apple IDの
    // サインインを毎回要求してしまうため、起動時の自動チェックでは使わない。
    // getAvailablePurchases()は認証プロンプトなしで現在の所有状況を読める。
    // タイムアウトは設けない(結果を待ってUIを変える処理ではないため)。
    // 失敗・オフラインは無音で無視し、キャッシュ値のまま維持する。
    getAvailablePurchases().catch(() => {});
  }, [connected, getAvailablePurchases]);

  useEffect(() => {
    // 'pending'(Ask to Buyの承認待ち・支払い確認待ちなど)の取引は所有とみなさない。
    // purchaseStateがpurchasedのものだけを「所有済み」として扱う。
    // p.idは取引ID(transactionId/orderId)なので商品IDの比較にはp.productIdを使う。
    const ownedPurchase = availablePurchases.find(
      (p) => p.productId === PREMIUM_PRODUCT_ID && p.purchaseState === 'purchased'
    );
    if (ownedPurchase) {
      setIsPremium(true);
      saveIsPremiumUnlocked(true);
      // Premium画面を開かずにここで初めて所有が判明するケース(起動時のバック
      // グラウンド検知など)もあるため、ここでもfinishTransactionしておく。
      // 既に完了済みのトランザクションに対する呼び出しは失敗しても無害。
      finishTransaction({ purchase: ownedPurchase, isConsumable: false }).catch(() => {});
    }
  }, [availablePurchases, finishTransaction]);

  return (
    <PurchaseContext.Provider value={{ isPremium, refreshPremiumStatus }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchaseStatus = () => useContext(PurchaseContext);
