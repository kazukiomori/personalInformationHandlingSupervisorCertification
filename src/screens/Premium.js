import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useIAP } from 'react-native-iap';
import Text from '../components/AppText';
import { PREMIUM_PRODUCT_ID, saveIsPremiumUnlocked } from '../utils/purchases';

const FEATURES = [
  { icon: '📝', title: '模擬試験モード', description: '制限時間付きで、本番を想定した模擬試験に挑戦できます。' },
  { icon: '📊', title: '学習履歴・進捗', description: '正答率の推移、カテゴリ別の弱点分析、学習カレンダーを確認できます。' },
  { icon: '⭐', title: 'ブックマーク復習', description: '「ブックマーク」した問題だけを集中的に復習できます。' },
];

const Premium = ({ navigation }) => {
  const [purchasing, setPurchasing] = useState(false);
  const alertShownRef = useRef(false);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    restorePurchases,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setPurchasing(false);
      if (purchase.id === PREMIUM_PRODUCT_ID) {
        await finishTransaction({ purchase, isConsumable: false });
      }
    },
    onPurchaseError: (error) => {
      setPurchasing(false);
      if (error.code !== 'user-cancelled') {
        Alert.alert('購入エラー', error.message || '購入処理に失敗しました');
      }
    },
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: 'in-app' });
    // 起動時にも一度復元チェックし、再インストール後の既存購入者をすぐ解放する
    restorePurchases().catch(() => {});
  }, [connected]);

  useEffect(() => {
    const owned = availablePurchases.some((p) => p.id === PREMIUM_PRODUCT_ID);
    if (owned && !alertShownRef.current) {
      alertShownRef.current = true;
      saveIsPremiumUnlocked(true).then(() => {
        Alert.alert('プレミアム解放', 'プレミアム機能が解放されました🎉', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      });
    }
  }, [availablePurchases]);

  const product = products.find((p) => p.id === PREMIUM_PRODUCT_ID);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PREMIUM_PRODUCT_ID },
          google: { skus: [PREMIUM_PRODUCT_ID] },
        },
        type: 'in-app',
      });
    } catch (error) {
      setPurchasing(false);
      Alert.alert('購入エラー', error.message || '購入処理に失敗しました');
    }
  };

  const handleRestore = () => {
    restorePurchases().catch((error) => {
      Alert.alert('復元エラー', error.message || '購入の復元に失敗しました');
    });
  };

  // 開発中の動作確認用。実ストアの決済なしにゲーティングの見た目を確認するためのもの。
  const handleDevToggle = async (value) => {
    await saveIsPremiumUnlocked(value);
    Alert.alert('開発用', `プレミアム状態を${value ? 'ON' : 'OFF'}にしました`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🔓 プレミアム機能</Text>
      <Text style={styles.subtitle}>買い切りで、以下の機能がずっと使えるようになります</Text>

      {FEATURES.map((feature) => (
        <View key={feature.title} style={styles.featureRow}>
          <Text style={styles.featureIcon}>{feature.icon}</Text>
          <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDescription}>{feature.description}</Text>
          </View>
        </View>
      ))}

      <Pressable
        style={[styles.purchaseButton, (purchasing || !connected) && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing || !connected}
      >
        <Text style={styles.purchaseButtonText}>
          {purchasing ? '処理中...' : product ? `${product.displayPrice} で購入する` : '購入する'}
        </Text>
      </Pressable>

      <Pressable style={styles.restoreButton} onPress={handleRestore}>
        <Text style={styles.restoreButtonText}>購入を復元する</Text>
      </Pressable>

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
  );
};

export default Premium;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
