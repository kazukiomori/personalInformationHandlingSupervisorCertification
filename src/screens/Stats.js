import { StyleSheet, View, ScrollView } from 'react-native'
import React, { useState, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native';
import Text from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES, ALL_CATEGORY } from '../config/question';
import {
  SESSION_HISTORY_KEY,
  aggregateCategoryStats,
  computeStreak,
  toDateOnlyString,
} from '../utils/sessionHistory';

const CALENDAR_DAYS = 28; // 4週間分
const TREND_SESSION_COUNT = 14; // 正答率推移グラフに表示する直近セッション数
const MODE_LABELS = {
  normal: '通常',
  review: '復習',
  bookmark: 'ブックマーク',
  mockExam: '模擬試験',
};
const WEAK_THRESHOLD = 60; // これを下回ると弱点として強調表示する正答率(%)

const buildCalendarDays = (studiedDates, now = new Date()) => {
  const days = [];
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = toDateOnlyString(d);
    days.push({ date: dateStr, day: d.getDate(), studied: studiedDates.has(dateStr) });
  }
  return days;
};

const Stats = () => {
  const [sessions, setSessions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      AsyncStorage.getItem(SESSION_HISTORY_KEY).then((stored) => {
        if (!isActive) return;
        setSessions(stored ? JSON.parse(stored) : []);
      });
      return () => { isActive = false; };
    }, [])
  );

  const today = new Date();
  const studiedDates = new Set(sessions.map((s) => s.date));
  const streak = computeStreak(sessions, today);
  const calendarDays = buildCalendarDays(studiedDates, today);
  const categoryStats = aggregateCategoryStats(sessions);
  const recentSessions = sessions.slice(-TREND_SESSION_COUNT);
  const historySessions = [...sessions].reverse(); // 新しい順に表示

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.streakBox}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakText}>連続学習日数: {streak}日</Text>
      </View>

      <Text style={styles.sectionTitle}>学習カレンダー(直近{CALENDAR_DAYS}日)</Text>
      <View style={styles.calendarGrid}>
        {calendarDays.map((d) => (
          <View
            key={d.date}
            style={[
              styles.calendarCell,
              d.studied && styles.calendarCellStudied,
              d.date === toDateOnlyString(today) && styles.calendarCellToday,
            ]}
          >
            <Text style={[styles.calendarCellText, d.studied && styles.calendarCellTextStudied]}>
              {d.day}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>正答率の推移(直近{recentSessions.length}回)</Text>
      {recentSessions.length === 0 ? (
        <Text style={styles.emptyText}>まだ学習記録がありません</Text>
      ) : (
        <View style={styles.trendContainer}>
          {recentSessions.map((s, index) => {
            const rate = s.totalCount > 0 ? Math.round((s.correctCount / s.totalCount) * 100) : 0;
            return (
              <View key={index} style={styles.trendBarWrapper}>
                <Text style={styles.trendRateText}>{rate}</Text>
                <View style={styles.trendBarTrack}>
                  <View style={[styles.trendBarFill, { height: `${rate}%` }]} />
                </View>
                <Text style={styles.trendDateText}>{s.date.slice(5).replace('-', '/')}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>カテゴリ別正答率</Text>
      {CATEGORIES.filter((c) => c !== ALL_CATEGORY).map((category) => {
        const stat = categoryStats[category] || { correct: 0, total: 0 };
        const rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : null;
        const isWeak = rate !== null && rate < WEAK_THRESHOLD;
        return (
          <View key={category} style={styles.categoryStatRow}>
            <Text style={styles.categoryStatLabel}>{category}</Text>
            <View style={styles.categoryStatBarTrack}>
              <View
                style={[
                  styles.categoryStatBarFill,
                  { width: `${rate ?? 0}%` },
                  isWeak && styles.categoryStatBarWeak,
                ]}
              />
            </View>
            <Text style={[styles.categoryStatText, isWeak && styles.categoryStatTextWeak]}>
              {rate === null ? '未学習' : `${rate}% (${stat.correct}/${stat.total})`}
            </Text>
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>学習履歴</Text>
      {historySessions.length === 0 ? (
        <Text style={styles.emptyText}>まだ学習記録がありません</Text>
      ) : (
        historySessions.map((s, index) => {
          const rate = s.totalCount > 0 ? Math.round((s.correctCount / s.totalCount) * 100) : 0;
          const modeLabel = MODE_LABELS[s.mode] || '通常';
          return (
            <View key={index} style={styles.historyRow}>
              <Text style={styles.historyDate}>{s.date}</Text>
              <Text style={styles.historyDetail}>
                {modeLabel} ・ {s.category}
              </Text>
              <Text style={styles.historyScore}>{s.correctCount}/{s.totalCount}問({rate}%)</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

export default Stats;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  streakBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 20,
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E65100",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  calendarCell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    margin: 3,
  },
  calendarCellStudied: {
    backgroundColor: "#1565C0",
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: "#FF69B4",
  },
  calendarCellText: {
    fontSize: 12,
    color: "#999",
  },
  calendarCellTextStudied: {
    color: "#fff",
    fontWeight: "bold",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    marginBottom: 24,
  },
  trendBarWrapper: {
    alignItems: "center",
    flex: 1,
  },
  trendRateText: {
    fontSize: 10,
    color: "#1565C0",
    marginBottom: 2,
  },
  trendBarTrack: {
    width: 14,
    height: 90,
    borderRadius: 4,
    backgroundColor: "#E3F2FD",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  trendBarFill: {
    width: "100%",
    backgroundColor: "#1565C0",
    borderRadius: 4,
  },
  trendDateText: {
    fontSize: 9,
    color: "#999",
    marginTop: 4,
  },
  categoryStatRow: {
    marginBottom: 14,
  },
  categoryStatLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  categoryStatBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E3F2FD",
    overflow: "hidden",
    marginBottom: 4,
  },
  categoryStatBarFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#1565C0",
  },
  categoryStatBarWeak: {
    backgroundColor: "#dc3545",
  },
  categoryStatText: {
    fontSize: 13,
    color: "#555",
  },
  categoryStatTextWeak: {
    color: "#dc3545",
    fontWeight: "bold",
  },
  historyRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  historyDate: {
    fontSize: 13,
    color: "#999",
  },
  historyDetail: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },
  historyScore: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1565C0",
    marginTop: 2,
  },
})
