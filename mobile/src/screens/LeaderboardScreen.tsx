import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageContext } from '../context/LanguageContext';
import { api, LeaderboardEntry, Difficulty, BoardSize } from '../lib/api';
import { formatTime } from '../lib/gameLogic';

interface LeaderboardScreenProps {
  navigation: any;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ navigation }) => {
  const { t } = useLanguageContext();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [boardSize, setBoardSize] = useState<BoardSize>(5);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(difficulty, boardSize);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [difficulty, boardSize]);

  const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard'];
  const boardSizeOptions: BoardSize[] = [5, 10, 15];

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <View style={styles.leaderboardItem}>
      <View style={styles.rankContainer}>
        <Text style={[
          styles.rank,
          index === 0 && styles.rankGold,
          index === 1 && styles.rankSilver,
          index === 2 && styles.rankBronze,
        ]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.nickname}>{item.nickname}</Text>
        <View style={styles.itemStats}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.statText}>{formatTime(item.time)}</Text>
          <Ionicons name="flash-outline" size={14} color="#64748b" style={{ marginLeft: 8 }} />
          <Text style={styles.statText}>{item.attempts}</Text>
        </View>
      </View>
      {index < 3 && (
        <Ionicons
          name="trophy"
          size={24}
          color={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#cd7f32'}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('leaderboard.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t('leaderboard.difficulty')}</Text>
          <View style={styles.filterRow}>
            {difficultyOptions.map((diff) => (
              <TouchableOpacity
                key={diff}
                style={[
                  styles.filterButton,
                  difficulty === diff && styles.filterButtonActive,
                ]}
                onPress={() => setDifficulty(diff)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    difficulty === diff && styles.filterButtonTextActive,
                  ]}
                >
                  {t(`difficulty.${diff}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>{t('leaderboard.boardSize')}</Text>
          <View style={styles.filterRow}>
            {boardSizeOptions.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.filterButton,
                  boardSize === size && styles.filterButtonActive,
                ]}
                onPress={() => setBoardSize(size)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    boardSize === size && styles.filterButtonTextActive,
                  ]}
                >
                  {size}×{size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : leaderboard.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>{t('leaderboard.noResults')}</Text>
          <Text style={styles.emptySubtext}>{t('leaderboard.beFirst')}</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  filters: {
    padding: 16,
    gap: 16,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
    gap: 8,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  rankGold: {
    color: '#fbbf24',
  },
  rankSilver: {
    color: '#94a3b8',
  },
  rankBronze: {
    color: '#cd7f32',
  },
  itemInfo: {
    flex: 1,
  },
  nickname: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
});
