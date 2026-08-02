import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useIAP, getAllTransactionsIOS } from 'react-native-iap';
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
    return loadIsPremiumUnlocked().then((value) => {
      console.log('[iap-debug] loadIsPremiumUnlocked (AsyncStorageキャッシュ) ->', value);
      setIsPremium(value);
    });
  }, []);

  useEffect(() => {
    refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const { connected, availablePurchases, getAvailablePurchases, finishTransaction } = useIAP();

  useEffect(() => {
    console.log('[iap-debug] connected ->', connected);
    if (!connected) return;
    // restorePurchases()はiOSでsyncIOS(AppStore.sync())を呼び、Apple IDの
    // サインインを毎回要求してしまうため、起動時の自動チェックでは使わない。
    // getAvailablePurchases()は認証プロンプトなしで現在の所有状況を読める。
    // タイムアウトは設けない(結果を待ってUIを変える処理ではないため)。
    // 失敗・オフラインは無音で無視し、キャッシュ値のまま維持する。
    console.log('[iap-debug] calling getAvailablePurchases()');
    getAvailablePurchases().catch((e) => console.log('[iap-debug] getAvailablePurchases error', e));
  }, [connected, getAvailablePurchases]);

  useEffect(() => {
    console.log('[iap-debug] availablePurchases changed, length =', availablePurchases.length);
    console.log('[iap-debug] availablePurchases content =', JSON.stringify(availablePurchases, null, 2));
    // 'pending'(Ask to Buyの承認待ち・支払い確認待ちなど)の取引は所有とみなさない。
    // purchaseStateがpurchasedのものだけを「所有済み」として扱う。
    // p.idは取引ID(transactionId/orderId)なので商品IDの比較にはp.productIdを使う。
    const ownedPurchase = availablePurchases.find(
      (p) => p.productId === PREMIUM_PRODUCT_ID && p.purchaseState === 'purchased'
    );
    console.log('[iap-debug] ownedPurchase ->', ownedPurchase ? JSON.stringify(ownedPurchase) : 'null (not found)');
    if (__DEV__ && ownedPurchase) {
      // __DEV__時は、開発用の「強制OFF」トグルでテストしている最中にここが
      // 即座にtrueへ戻してしまうと手動での状態確認ができないため、自動付与を
      // 行わない。本番・TestFlightビルドは__DEV__が常にfalseなので影響しない。
      console.log('[iap-debug] __DEV__のため自動付与をスキップ(強制トグルで手動確認してください)');
    } else if (ownedPurchase) {
      setIsPremium(true);
      saveIsPremiumUnlocked(true);
      // Premium画面を開かずにここで初めて所有が判明するケース(起動時のバック
      // グラウンド検知など)もあるため、ここでもfinishTransactionしておく。
      // 既に完了済みのトランザクションに対する呼び出しは失敗しても無害。
      //
      // 注意: getAvailablePurchases()由来の購入はreact-native-iap(v15.5.2)の
      // iOSネイティブ側キャッシュ(purchasePayloadById)を埋めないため、そのまま
      // finishTransactionすると「Missing cached purchase payload」→デコード失敗
      // になる既知の問題がある。getPendingTransactionsIOS()(Transaction.unfinished)
      // は既に一度finishTransaction済みの取引を拾えないため、完了・未完了を問わず
      // 全取引を返すgetAllTransactionsIOS()(Transaction.all)を先に呼んでキャッシュを
      // 埋めてからfinishTransactionする。
      getAllTransactionsIOS()
        .catch(() => {})
        .finally(() => {
          finishTransaction({ purchase: ownedPurchase, isConsumable: false }).catch(() => {});
        });
    }
  }, [availablePurchases, finishTransaction]);

  return (
    <PurchaseContext.Provider value={{ isPremium, refreshPremiumStatus }}>
      {children}
    </PurchaseContext.Provider>
  );
};

export const usePurchaseStatus = () => useContext(PurchaseContext);
