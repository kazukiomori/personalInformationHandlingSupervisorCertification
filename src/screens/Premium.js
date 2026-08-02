import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useIAP, getAllTransactionsIOS } from 'react-native-iap';
import Text from '../components/AppText';
import { PREMIUM_PRODUCT_ID, PREMIUM_PRICE_LABEL, saveIsPremiumUnlocked } from '../utils/purchases';
import { usePurchaseStatus } from '../context/PurchaseContext';

const FEATURES = [
  { icon: '📝', title: '模擬試験モード', description: '制限時間付きで、本番を想定した模擬試験に挑戦できます。' },
  { icon: '📊', title: '学習履歴・進捗', description: '正答率の推移、カテゴリ別の弱点分析、学習カレンダーを確認できます。' },
  { icon: '⭐', title: 'ブックマーク復習', description: '「ブックマーク」した問題だけを集中的に復習できます。' },
];

// iOS復元(syncIOS)・購入(requestPurchase)はApple ID認証〜App Store側の応答待ちで、
// Apple側の障害・混雑時は成功も失敗もせず無期限にpendingし続けることがある。
// その場合ユーザーには「反応がない」としか見えないため、タイムアウトで必ず結果を返す。
// 購入はFace ID/パスワード入力等のユーザー操作を挟むため、復元より長めに待つ。
const RESTORE_TIMEOUT_MS = 30000;
const PURCHASE_TIMEOUT_MS = 30000;
const IAP_TIMEOUT_ERROR = 'IAP_TIMEOUT';

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(IAP_TIMEOUT_ERROR)), ms)),
  ]);

const Premium = ({ navigation }) => {
  const { refreshPremiumStatus } = usePurchaseStatus();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const alertShownRef = useRef(false);
  const pendingAlertShownRef = useRef(false);
  // 「購入を復元する」ボタンを押している最中かどうか。onErrorはuseIAP内部の
  // optionsRef経由で常に最新のクロージャを読むため実害はないはずだが、
  // stateよりrefの方が確実なのでこちらを使う。
  const restoreRequestedRef = useRef(false);
  // 購入結果(onPurchaseSuccess/Error)がApple側の保留で永遠に来ない場合に
  // 「処理中...」のまま固まるのを防ぐためのタイムアウトタイマー。
  const purchaseTimerRef = useRef(null);

  const clearPurchaseTimer = () => {
    if (purchaseTimerRef.current) {
      clearTimeout(purchaseTimerRef.current);
      purchaseTimerRef.current = null;
    }
  };

  // 画面を離れるときにタイマーを片付ける(未マウントでのsetState防止)
  useEffect(() => clearPurchaseTimer, []);

  const {
    connected,
    availablePurchases,
    requestPurchase,
    restorePurchases,
    getAvailablePurchases,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      clearPurchaseTimer();
      setPurchasing(false);
      // purchase.idは取引ID(iOS: transactionId / Android: orderId)であり商品IDではない。
      // 商品を判定する際は必ずproductIdを見る。
      if (purchase.productId !== PREMIUM_PRODUCT_ID) return;

      // Ask to Buy(ファミリー共有の承認待ち)や支払い方法の確認待ちの場合、
      // purchaseStateが'pending'のままコールバックが呼ばれることがある。
      // ここでfinishTransaction・プレミアム解放をしてしまうと、後で保留が
      // 失敗に終わった場合に無料で機能を使われてしまうため、確定するまで待つ。
      if (purchase.purchaseState === 'pending') {
        if (!pendingAlertShownRef.current) {
          pendingAlertShownRef.current = true;
          Alert.alert(
            '購入が保留中です',
            'ファミリー共有の承認待ち、または支払い方法の確認待ちの可能性があります。確認が完了次第、自動的にプレミアム機能が解放されます。',
          );
        }
        return;
      }

      // availablePurchasesの再取得を待たず、購入成功時点でその場で解放する。
      // finishTransactionより先にエンタイトルメント付与を行うことで、万一
      // finishTransaction前後でアプリが落ちても「決済済みなのに未解放」を防ぐ。
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        try {
          await saveIsPremiumUnlocked(true);
          await refreshPremiumStatus();
          try {
            await finishTransaction({ purchase, isConsumable: false });
          } catch (error) {
            // 次回起動時にiOSが未完了トランザクションとして再度届けてくれるため、
            // ここでの失敗はユーザーへの解放アラートをブロックしない。ただしログは残す。
            console.warn('[iap] finishTransaction failed', error);
          }
          Alert.alert('プレミアム解放', 'プレミアム機能が解放されました🎉', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch (error) {
          // saveIsPremiumUnlocked/refreshPremiumStatus自体が失敗した場合、
          // alertShownRefをtrueのまま残すと以後この画面で解放処理が二度と
          // 走らなくなるため戻す。
          console.warn('[iap] unlock failed', error);
          alertShownRef.current = false;
          Alert.alert(
            '購入確認エラー',
            '購入は完了している可能性がありますが、アプリ内での反映に失敗しました。「購入を復元する」をお試しください。',
          );
        }
      }
    },
    onPurchaseError: (error) => {
      clearPurchaseTimer();
      setPurchasing(false);
      if (error.code !== 'user-cancelled') {
        Alert.alert('購入エラー', error.message || '購入処理に失敗しました');
      }
    },
    // restorePurchases()はiOS側のsyncIOS(サーバー同期)が失敗しても内部で
    // 握りつぶして正常終了してしまうため、ここで拾わないとユーザーには
    // 何も起きていないように見えてしまう。バックグラウンドの自動チェック
    // 中は静かに無視し、ユーザーが「購入を復元する」を押した直後だけ表示する。
    onError: (error) => {
      if (restoreRequestedRef.current) {
        Alert.alert('復元エラー', error.message || '購入の復元に失敗しました');
      }
    },
  });

  useEffect(() => {
    if (!connected) return;
    // 画面を開いた時にも一度所有状況をチェックし、再インストール後の既存購入者をすぐ解放する。
    // restorePurchases()はiOSでApple IDサインインを毎回要求してしまうため、
    // 自動チェックでは認証プロンプトの出ないgetAvailablePurchases()を使う。
    // (手動の「購入を復元する」ボタンは従来どおりrestorePurchases()を使う)
    getAvailablePurchases().catch(() => {});
  }, [connected]);

  useEffect(() => {
    // 'pending'(保留中)の取引は所有とみなさない。purchaseStateがpurchasedのものだけを見る。
    // p.idは取引ID(transactionId/orderId)なので商品IDの比較にはp.productIdを使う。
    const ownedPurchase = availablePurchases.find(
      (p) => p.productId === PREMIUM_PRODUCT_ID && p.purchaseState === 'purchased'
    );
    // __DEV__時は開発用トグルでの手動テストを優先し、自動付与はしない
    // (PurchaseContext.jsと同じ理由)。
    if (!__DEV__ && ownedPurchase && !alertShownRef.current) {
      alertShownRef.current = true;
      (async () => {
        try {
          await saveIsPremiumUnlocked(true);
          await refreshPremiumStatus();
          try {
            // getAvailablePurchases()/restorePurchases()由来の購入はreact-native-iap
            // (v15.5.2)のiOSネイティブ側キャッシュ(purchasePayloadById)を埋めないため、
            // そのままfinishTransactionすると「Missing cached purchase payload」で
            // デコード失敗する既知の問題がある。getPendingTransactionsIOS()
            // (Transaction.unfinished)は既に一度finishTransaction済みの取引を
            // 拾えないため、完了・未完了を問わず全取引を返すgetAllTransactionsIOS()
            // (Transaction.all)を先に呼んでキャッシュを埋めてからfinishTransactionする。
            await getAllTransactionsIOS().catch(() => {});
            await finishTransaction({ purchase: ownedPurchase, isConsumable: false });
          } catch (error) {
            // 既に完了済みのトランザクションはエラー扱いにならない実装だが、念のためログに残す。
            console.warn('[iap] finishTransaction failed', error);
          }
          Alert.alert('プレミアム解放', 'プレミアム機能が解放されました🎉', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch (error) {
          console.warn('[iap] unlock failed', error);
          alertShownRef.current = false;
        }
      })();
    }
  }, [availablePurchases]);

  const handlePurchase = async () => {
    setPurchasing(true);
    // requestPurchaseはリクエスト開始時点で解決し、実際の購入結果は
    // onPurchaseSuccess/onPurchaseErrorで届く。Apple側の保留でそれらが
    // いつまでも来ない場合に備え、別建てのタイマーでタイムアウトさせる。
    clearPurchaseTimer();
    purchaseTimerRef.current = setTimeout(() => {
      purchaseTimerRef.current = null;
      setPurchasing(false);
      Alert.alert(
        '購入処理に時間がかかっています',
        'App Store側の混雑・障害等により時間がかかっている可能性があります。しばらく時間をおいてから再度お試しください。',
      );
    }, PURCHASE_TIMEOUT_MS);

    try {
      await requestPurchase({
        request: {
          apple: { sku: PREMIUM_PRODUCT_ID },
          google: { skus: [PREMIUM_PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch (error) {
      clearPurchaseTimer();
      setPurchasing(false);
      Alert.alert('購入エラー', error.message || '購入処理に失敗しました');
    }
  };

  const handleRestore = async () => {
    restoreRequestedRef.current = true;
    setRestoring(true);
    try {
      await withTimeout(restorePurchases(), RESTORE_TIMEOUT_MS);
      // restorePurchases()が正常終了しても、対象の購入が見つからなければ
      // availablePurchases監視のuseEffectは何もしないため、ユーザーには
      // 「復元中...→何も起きない」としか見えない。少し待って、まだ解放
      // されていなければ「見つかりませんでした」と案内する。
      setTimeout(() => {
        if (restoreRequestedRef.current && !alertShownRef.current) {
          Alert.alert(
            '復元できませんでした',
            '復元可能な購入情報が見つかりませんでした。購入時と同じApple IDでサインインしているかご確認ください。',
          );
        }
        restoreRequestedRef.current = false;
      }, 1500);
    } catch (error) {
      restoreRequestedRef.current = false;
      if (error.message === IAP_TIMEOUT_ERROR) {
        Alert.alert(
          '復元に時間がかかっています',
          'App Store側の混雑・障害等により時間がかかっている可能性があります。しばらく時間をおいてから再度お試しください。',
        );
      } else {
        Alert.alert('復元エラー', error.message || '購入の復元に失敗しました');
      }
    } finally {
      setRestoring(false);
    }
  };

  // 開発中の動作確認用。実ストアの決済なしにゲーティングの見た目を確認するためのもの。
  const handleDevToggle = async (value) => {
    await saveIsPremiumUnlocked(value);
    await refreshPremiumStatus();
    Alert.alert('開発用', `プレミアム状態を${value ? 'ON' : 'OFF'}にしました`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔓 プレミアム機能</Text>
        <Text style={styles.subtitle}>買い切り{PREMIUM_PRICE_LABEL}で、以下の機能がずっと使えるようになります</Text>

        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>(開発用・実際の課金なし)</Text>
            <Pressable style={styles.devButton} onPress={() => handleDevToggle(true)}>
              <Text style={styles.devButtonText}>プレミアムを強制ON</Text>
            </Pressable>
            <Pressable style={styles.devButton} onPress={() => handleDevToggle(false)}>
              <Text style={styles.devButtonText}>プレミアムを強制OFF</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 購入ボタンはスクロール領域の外に固定し、画面サイズやiPad互換モードに関わらず常に見えるようにする */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.purchaseButton, (purchasing || !connected) && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !connected}
        >
          <Text style={styles.purchaseButtonText}>
            {purchasing ? '処理中...' : `${PREMIUM_PRICE_LABEL} で購入する`}
          </Text>
        </Pressable>

        <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={restoring || !connected}>
          <Text style={styles.restoreButtonText}>{restoring ? '復元中...' : '購入を復元する'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default Premium;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  purchaseButton: {
    backgroundColor: '#1565C0',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
  },
  restoreButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565C0',
    textDecorationLine: 'underline',
  },
  devBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  devLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  devButton: {
    backgroundColor: '#eee',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
  },
});
