import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageContext } from '../context/LanguageContext';
import { GameBoard } from '../components/GameBoard';
import { TargetList } from '../components/TargetList';
import { GameStats } from '../components/GameStats';
import { ExpressionDisplay } from '../components/ExpressionDisplay';
import { Cell, Difficulty, BoardSize, api } from '../lib/api';
import { generateBoard, generateTargets, findAllSolutions, formatTime } from '../lib/gameLogic';

interface GameScreenProps {
  navigation: any;
  route?: {
    params?: {
      customBoard?: {
        id: number;
        boardData: Cell[][];
        targets: number[];
        boardSize: number;
        difficulty: string;
        name: string;
      };
    };
  };
}

interface GameState {
  board: Cell[][];
  targets: number[];
  foundTargets: Set<number>;
  selectedCells: { row: number; col: number }[];
  gameTime: number;
  isPlaying: boolean;
  attemptCount: number;
  currentExpression: string;
  currentResult: number | null;
  difficulty: Difficulty;
  boardSize: BoardSize;
  showSolutions: boolean;
  solutions: { cells: { row: number; col: number }[]; target: number; expression: string }[];
}

export const GameScreen: React.FC<GameScreenProps> = ({ navigation, route }) => {
  const { t } = useLanguageContext();
  const customBoard = route?.params?.customBoard;
  
  const [gameState, setGameState] = useState<GameState>({
    board: [],
    targets: [],
    foundTargets: new Set(),
    selectedCells: [],
    gameTime: 0,
    isPlaying: false,
    attemptCount: 0,
    currentExpression: '',
    currentResult: null,
    difficulty: 'easy',
    boardSize: 5,
    showSolutions: false,
    solutions: [],
  });

  const [showSettingsModal, setShowSettingsModal] = useState(!customBoard);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [playerNickname, setPlayerNickname] = useState('');
  const [tempDifficulty, setTempDifficulty] = useState<Difficulty>('easy');
  const [tempBoardSize, setTempBoardSize] = useState<BoardSize>(5);

  const initializeGame = useCallback((difficulty?: Difficulty, boardSize?: BoardSize, customBoardData?: { board: Cell[][]; targets: number[] }) => {
    let board: Cell[][];
    let targets: number[];
    let newDifficulty: Difficulty;
    let newBoardSize: BoardSize;

    if (customBoardData) {
      board = customBoardData.board;
      targets = customBoardData.targets;
      newDifficulty = (customBoard?.difficulty || 'easy') as Difficulty;
      newBoardSize = (customBoard?.boardSize || 5) as BoardSize;
    } else {
      newDifficulty = difficulty || gameState.difficulty;
      newBoardSize = boardSize || gameState.boardSize;
      board = generateBoard(newBoardSize, newDifficulty);
      targets = generateTargets(board, newBoardSize);
    }
    
    setGameState({
      board,
      targets,
      foundTargets: new Set(),
      selectedCells: [],
      gameTime: 0,
      isPlaying: true,
      attemptCount: 0,
      currentExpression: '',
      currentResult: null,
      difficulty: newDifficulty,
      boardSize: newBoardSize,
      showSolutions: false,
      solutions: [],
    });
    setShowVictoryModal(false);
    setShowSettingsModal(false);
  }, [gameState.difficulty, gameState.boardSize, customBoard]);

  useEffect(() => {
    if (customBoard) {
      initializeGame(undefined, undefined, {
        board: customBoard.boardData,
        targets: customBoard.targets,
      });
    }
  }, [customBoard]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.isPlaying) {
      interval = setInterval(() => {
        setGameState(prev => ({ ...prev, gameTime: prev.gameTime + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  const handleSelectionChange = useCallback((
    cells: { row: number; col: number }[],
    expression: string,
    result: number | null
  ) => {
    setGameState(prev => ({
      ...prev,
      selectedCells: cells,
      currentExpression: expression,
      currentResult: result,
    }));
  }, []);

  const handleSelectionEnd = useCallback(() => {
    if (gameState.currentResult !== null && gameState.selectedCells.length >= 3) {
      const result = gameState.currentResult;
      
      setGameState(prev => ({ ...prev, attemptCount: prev.attemptCount + 1 }));

      if (gameState.targets.includes(result) && !gameState.foundTargets.has(result)) {
        const newFoundTargets = new Set(gameState.foundTargets);
        newFoundTargets.add(result);
        
        setGameState(prev => ({ ...prev, foundTargets: newFoundTargets }));
        
        Alert.alert(t('toast.found'), `${t('toast.foundNumber')} ${result}!`);

        if (newFoundTargets.size === gameState.targets.length) {
          setGameState(prev => ({ ...prev, isPlaying: false }));
          setShowVictoryModal(true);
        }
      }
    }

    setGameState(prev => ({
      ...prev,
      selectedCells: [],
      currentExpression: '',
      currentResult: null,
    }));
  }, [gameState.currentResult, gameState.selectedCells.length, gameState.targets, gameState.foundTargets, t]);

  const handleGiveUp = () => {
    const solutions = findAllSolutions(gameState.board, gameState.targets, gameState.boardSize);
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      showSolutions: true,
      solutions
    }));
  };

  const handleSaveScore = async () => {
    if (!playerNickname.trim()) {
      Alert.alert('Error', t('victory.enterNickname'));
      return;
    }

    try {
      if (customBoard) {
        await api.submitCustomBoardScore(customBoard.id, {
          nickname: playerNickname,
          time: gameState.gameTime,
          attempts: gameState.attemptCount,
        });
      } else {
        await api.submitScore({
          nickname: playerNickname,
          time: gameState.gameTime,
          attempts: gameState.attemptCount,
          difficulty: gameState.difficulty,
          boardSize: gameState.boardSize,
        });
      }
      Alert.alert('Success', 'Score saved!');
      setShowVictoryModal(false);
      navigation.navigate('Leaderboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to save score');
    }
  };

  const startGame = () => {
    initializeGame(tempDifficulty, tempBoardSize);
  };

  const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard'];
  const boardSizeOptions: BoardSize[] = [5, 10, 15];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {customBoard ? customBoard.name : t('game.title')}
        </Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
          <Ionicons name="settings-outline" size={24} color="#f1f5f9" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {gameState.board.length > 0 && (
          <>
            <GameStats
              gameTime={gameState.gameTime}
              attemptCount={gameState.attemptCount}
              foundCount={gameState.foundTargets.size}
              totalTargets={gameState.targets.length}
              t={t}
            />

            <TargetList
              targets={gameState.targets}
              foundTargets={gameState.foundTargets}
              t={t}
            />

            <ExpressionDisplay
              expression={gameState.currentExpression}
              result={gameState.currentResult}
              t={t}
            />

            <GameBoard
              board={gameState.board}
              boardSize={gameState.boardSize}
              selectedCells={gameState.selectedCells}
              onSelectionChange={handleSelectionChange}
              onSelectionEnd={handleSelectionEnd}
              foundTargets={gameState.foundTargets}
              solutionCells={gameState.showSolutions ? gameState.solutions.flatMap(s => s.cells) : []}
            />

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.giveUpButton]}
                onPress={handleGiveUp}
              >
                <Ionicons name="flag" size={20} color="#ef4444" />
                <Text style={styles.giveUpButtonText}>{t('game.giveUp')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.newGameButton]}
                onPress={() => initializeGame()}
              >
                <Ionicons name="refresh" size={20} color="#22c55e" />
                <Text style={styles.newGameButtonText}>{t('game.newGame')}</Text>
              </TouchableOpacity>
            </View>

            {gameState.showSolutions && gameState.solutions.length > 0 && (
              <View style={styles.solutionsContainer}>
                <Text style={styles.solutionsTitle}>{t('game.solutions.title')}</Text>
                {gameState.solutions.slice(0, 10).map((solution, index) => (
                  <View key={index} style={styles.solutionItem}>
                    <Text style={styles.solutionExpression}>{solution.expression}</Text>
                    <Text style={styles.solutionEquals}>=</Text>
                    <Text style={styles.solutionResult}>{solution.target}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.title')}</Text>

            <Text style={styles.optionLabel}>{t('settings.difficulty')}</Text>
            <View style={styles.optionRow}>
              {difficultyOptions.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.optionButton,
                    tempDifficulty === diff && styles.optionButtonActive,
                  ]}
                  onPress={() => setTempDifficulty(diff)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      tempDifficulty === diff && styles.optionButtonTextActive,
                    ]}
                  >
                    {t(`difficulty.${diff}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.optionLabel}>{t('settings.boardSize')}</Text>
            <View style={styles.optionRow}>
              {boardSizeOptions.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.optionButton,
                    tempBoardSize === size && styles.optionButtonActive,
                  ]}
                  onPress={() => setTempBoardSize(size)}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      tempBoardSize === size && styles.optionButtonTextActive,
                    ]}
                  >
                    {size}×{size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  if (gameState.board.length > 0) {
                    setShowSettingsModal(false);
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text style={styles.cancelButtonText}>{t('settings.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.startButton]}
                onPress={startGame}
              >
                <Text style={styles.startButtonText}>{t('settings.startGame')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showVictoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="trophy" size={64} color="#fbbf24" />
            <Text style={styles.victoryTitle}>{t('victory.title')}</Text>
            <Text style={styles.victoryMessage}>{t('victory.message')}</Text>
            
            <View style={styles.victoryStats}>
              <Text style={styles.victoryStatLabel}>{t('victory.yourTime')}</Text>
              <Text style={styles.victoryStat}>{formatTime(gameState.gameTime)}</Text>
            </View>

            <TextInput
              style={styles.nicknameInput}
              placeholder={t('victory.nicknamePlaceholder')}
              placeholderTextColor="#64748b"
              value={playerNickname}
              onChangeText={setPlayerNickname}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveScore}>
              <Text style={styles.saveButtonText}>{t('victory.saveResult')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                setShowVictoryModal(false);
                initializeGame();
              }}
            >
              <Text style={styles.skipButtonText}>{t('game.newGame')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  giveUpButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  newGameButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  giveUpButtonText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  newGameButtonText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  solutionsContainer: {
    marginTop: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  solutionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  solutionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  solutionExpression: {
    fontSize: 16,
    color: '#f1f5f9',
  },
  solutionEquals: {
    fontSize: 16,
    color: '#64748b',
  },
  solutionResult: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#3b82f6',
  },
  optionButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  optionButtonTextActive: {
    color: '#ffffff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  cancelButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  victoryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginTop: 16,
  },
  victoryMessage: {
    fontSize: 18,
    color: '#f1f5f9',
    marginTop: 8,
  },
  victoryStats: {
    marginTop: 24,
    alignItems: 'center',
  },
  victoryStatLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  victoryStat: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  nicknameInput: {
    width: '100%',
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 16,
    marginTop: 24,
  },
  saveButton: {
    width: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  skipButton: {
    marginTop: 12,
    padding: 8,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 14,
  },
});
