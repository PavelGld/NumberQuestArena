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
import { api, CustomBoard, Difficulty, BoardSize } from '../lib/api';

interface CustomBoardsScreenProps {
  navigation: any;
}

export const CustomBoardsScreen: React.FC<CustomBoardsScreenProps> = ({ navigation }) => {
  const { t } = useLanguageContext();
  const [boards, setBoards] = useState<CustomBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopular, setShowPopular] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [boardSize, setBoardSize] = useState<BoardSize | 'all'>('all');

  const fetchBoards = async () => {
    setLoading(true);
    try {
      let data: CustomBoard[];
      if (showPopular) {
        data = await api.getTopCustomBoards();
      } else {
        data = await api.getCustomBoards(
          difficulty === 'all' ? undefined : difficulty,
          boardSize === 'all' ? undefined : boardSize
        );
      }
      setBoards(data);
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, [showPopular, difficulty, boardSize]);

  const handlePlayBoard = (board: CustomBoard) => {
    navigation.navigate('Game', {
      customBoard: {
        id: board.id,
        boardData: board.boardData,
        targets: board.targets,
        boardSize: board.boardSize,
        difficulty: board.difficulty,
        name: board.name,
      },
    });
  };

  const difficultyOptions: (Difficulty | 'all')[] = ['all', 'easy', 'medium', 'hard'];
  const boardSizeOptions: (BoardSize | 'all')[] = ['all', 5, 10, 15];

  const renderItem = ({ item }: { item: CustomBoard }) => (
    <TouchableOpacity
      style={styles.boardItem}
      onPress={() => handlePlayBoard(item)}
    >
      <View style={styles.boardHeader}>
        <Text style={styles.boardName}>{item.name}</Text>
        <View style={[
          styles.difficultyBadge,
          item.difficulty === 'easy' && styles.difficultyEasy,
          item.difficulty === 'medium' && styles.difficultyMedium,
          item.difficulty === 'hard' && styles.difficultyHard,
        ]}>
          <Text style={styles.difficultyText}>{t(`difficulty.${item.difficulty}`)}</Text>
        </View>
      </View>
      
      <View style={styles.boardInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="person-outline" size={14} color="#64748b" />
          <Text style={styles.infoText}>{item.creatorName}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="grid-outline" size={14} color="#64748b" />
          <Text style={styles.infoText}>{item.boardSize}×{item.boardSize}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="trophy-outline" size={14} color="#64748b" />
          <Text style={styles.infoText}>{item.completionCount}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => handlePlayBoard(item)}
      >
        <Ionicons name="play" size={20} color="#ffffff" />
        <Text style={styles.playButtonText}>{t('customBoards.play')}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('customBoards.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, showPopular && styles.tabActive]}
          onPress={() => setShowPopular(true)}
        >
          <Text style={[styles.tabText, showPopular && styles.tabTextActive]}>
            {t('customBoards.popular')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, !showPopular && styles.tabActive]}
          onPress={() => setShowPopular(false)}
        >
          <Text style={[styles.tabText, !showPopular && styles.tabTextActive]}>
            {t('customBoards.all')}
          </Text>
        </TouchableOpacity>
      </View>

      {!showPopular && (
        <View style={styles.filters}>
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
                  {diff === 'all' ? t('customBoards.all') : t(`difficulty.${diff}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                  {size === 'all' ? t('customBoards.all') : `${size}×${size}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : boards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="grid-outline" size={64} color="#334155" />
          <Text style={styles.emptyText}>{t('leaderboard.noResults')}</Text>
        </View>
      ) : (
        <FlatList
          data={boards}
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
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
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
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#3b82f6',
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  boardItem: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  boardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  boardName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyEasy: {
    backgroundColor: '#14532d',
  },
  difficultyMedium: {
    backgroundColor: '#713f12',
  },
  difficultyHard: {
    backgroundColor: '#7f1d1d',
  },
  difficultyText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  boardInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    color: '#64748b',
    fontSize: 13,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  playButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
