import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatTime } from '../lib/gameLogic';

interface GameStatsProps {
  gameTime: number;
  attemptCount: number;
  foundCount: number;
  totalTargets: number;
  t: (key: string) => string;
}

export const GameStats: React.FC<GameStatsProps> = ({
  gameTime,
  attemptCount,
  foundCount,
  totalTargets,
  t,
}) => {
  const progress = totalTargets > 0 ? (foundCount / totalTargets) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={20} color="#60a5fa" />
          <Text style={styles.statValue}>{formatTime(gameTime)}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="flash-outline" size={20} color="#fbbf24" />
          <Text style={styles.statValue}>{attemptCount}</Text>
          <Text style={styles.statLabel}>{t('game.stats.attempts')}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
          <Text style={styles.statValue}>
            {foundCount}/{totalTargets}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {t('game.progress.title')}: {foundCount} {t('game.progress.of')} {totalTargets}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
