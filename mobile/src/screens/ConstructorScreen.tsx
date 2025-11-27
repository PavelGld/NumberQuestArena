import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageContext } from '../context/LanguageContext';
import { Cell, Operation, Difficulty, BoardSize, api } from '../lib/api';
import { evaluateExpression, isValidPath } from '../lib/gameLogic';

interface ConstructorScreenProps {
  navigation: any;
}

const OPERATIONS: Operation[] = ['+', '-', '*', '/', '^'];
const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export const ConstructorScreen: React.FC<ConstructorScreenProps> = ({ navigation }) => {
  const { t } = useLanguageContext();
  
  const [boardName, setBoardName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [boardSize, setBoardSize] = useState<BoardSize>(5);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showCellEditor, setShowCellEditor] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  const [testSelectedCells, setTestSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [testExpression, setTestExpression] = useState('');
  const [testResult, setTestResult] = useState<number | null>(null);
  const [testFoundTargets, setTestFoundTargets] = useState<Set<number>>(new Set());
  const [isTestMode, setIsTestMode] = useState(false);

  const initializeBoard = useCallback((size: BoardSize) => {
    const newBoard: Cell[][] = [];
    for (let row = 0; row < size; row++) {
      newBoard[row] = [];
      for (let col = 0; col < size; col++) {
        const isNumberCell = (row + col) % 2 === 0;
        newBoard[row][col] = {
          value: isNumberCell ? NUMBERS[Math.floor(Math.random() * NUMBERS.length)] : OPERATIONS[Math.floor(Math.random() * 3)],
          type: isNumberCell ? 'number' : 'operation',
          row,
          col,
        };
      }
    }
    setBoard(newBoard);
    setTargets([]);
    setIsSolved(false);
    setIsDirty(false);
    setTestFoundTargets(new Set());
  }, []);

  React.useEffect(() => {
    initializeBoard(boardSize);
  }, [boardSize, initializeBoard]);

  const handleCellPress = (row: number, col: number) => {
    if (isTestMode) {
      handleTestCellPress(row, col);
    } else {
      setSelectedCell({ row, col });
      setShowCellEditor(true);
    }
  };

  const handleTestCellPress = (row: number, col: number) => {
    const newCells = [...testSelectedCells, { row, col }];
    
    if (!isValidPath(newCells) && newCells.length > 1) {
      return;
    }

    if (newCells.length > 0) {
      const startCell = board[newCells[0].row][newCells[0].col];
      if (startCell.type !== "number") return;
    }

    const expression: (number | Operation)[] = [];
    let validExpression = true;

    for (let i = 0; i < newCells.length; i++) {
      const cell = board[newCells[i].row][newCells[i].col];
      const expectedType = i % 2 === 0 ? "number" : "operation";
      if (cell.type !== expectedType) {
        validExpression = false;
        break;
      }
      expression.push(cell.value as number | Operation);
    }

    if (!validExpression && newCells.length > 1) return;

    let expressionString = expression.join(' ');
    const result = expression.length >= 3 ? evaluateExpression(expression) : null;
    
    setTestSelectedCells(newCells);
    setTestExpression(expressionString);
    setTestResult(result);
  };

  const confirmTestSelection = () => {
    if (testResult !== null && targets.includes(testResult) && !testFoundTargets.has(testResult)) {
      const newFound = new Set(testFoundTargets);
      newFound.add(testResult);
      setTestFoundTargets(newFound);
      
      if (newFound.size === targets.length) {
        setIsSolved(true);
        setIsTestMode(false);
        Alert.alert(t('victory.title'), t('victory.message'));
      } else {
        Alert.alert(t('toast.found'), `${t('toast.foundNumber')} ${testResult}!`);
      }
    }
    
    setTestSelectedCells([]);
    setTestExpression('');
    setTestResult(null);
  };

  const updateCellValue = (value: number | Operation) => {
    if (!selectedCell) return;
    
    const newBoard = [...board];
    newBoard[selectedCell.row][selectedCell.col] = {
      ...newBoard[selectedCell.row][selectedCell.col],
      value,
    };
    setBoard(newBoard);
    setShowCellEditor(false);
    setSelectedCell(null);
    setIsDirty(true);
    if (isSolved) setIsSolved(false);
  };

  const addTarget = () => {
    Alert.prompt(
      t('constructor.addTarget'),
      '',
      (text) => {
        const num = parseInt(text);
        if (!isNaN(num) && num > 0 && num <= 1000 && !targets.includes(num)) {
          setTargets([...targets, num]);
          setIsDirty(true);
          if (isSolved) setIsSolved(false);
        }
      },
      'plain-text',
      '',
      'number-pad'
    );
  };

  const removeTarget = (index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    setTargets(newTargets);
    setIsDirty(true);
    if (isSolved) setIsSolved(false);
  };

  const startTestMode = () => {
    if (targets.length === 0) {
      Alert.alert('Error', 'Add at least one target number');
      return;
    }
    setIsTestMode(true);
    setTestFoundTargets(new Set());
    setTestSelectedCells([]);
    setTestExpression('');
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!boardName.trim() || !creatorName.trim()) {
      Alert.alert('Error', 'Please fill in board name and creator name');
      return;
    }
    
    if (targets.length === 0) {
      Alert.alert('Error', 'Add at least one target number');
      return;
    }
    
    if (!isSolved) {
      Alert.alert('Error', t('constructor.validation'));
      return;
    }

    try {
      await api.createCustomBoard({
        name: boardName,
        creatorName: creatorName,
        difficulty,
        boardSize,
        boardData: board,
        targets,
        isSolved: true,
      });
      Alert.alert('Success', 'Board saved!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save board');
    }
  };

  const cellSize = Math.floor((300 - 16) / boardSize);

  const difficultyOptions: Difficulty[] = ['easy', 'medium', 'hard'];
  const boardSizeOptions: BoardSize[] = [5, 10, 15];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f1f5f9" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('constructor.title')}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Ionicons name="save" size={24} color={isSolved ? '#22c55e' : '#64748b'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder={t('constructor.name')}
            placeholderTextColor="#64748b"
            value={boardName}
            onChangeText={setBoardName}
          />
          <TextInput
            style={styles.input}
            placeholder={t('constructor.creatorName')}
            placeholderTextColor="#64748b"
            value={creatorName}
            onChangeText={setCreatorName}
          />
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{t('settings.difficulty')}</Text>
            <View style={styles.settingOptions}>
              {difficultyOptions.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.settingButton,
                    difficulty === diff && styles.settingButtonActive,
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text style={[
                    styles.settingButtonText,
                    difficulty === diff && styles.settingButtonTextActive,
                  ]}>
                    {t(`difficulty.${diff}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>{t('settings.boardSize')}</Text>
            <View style={styles.settingOptions}>
              {boardSizeOptions.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.settingButton,
                    boardSize === size && styles.settingButtonActive,
                  ]}
                  onPress={() => {
                    setBoardSize(size);
                  }}
                >
                  <Text style={[
                    styles.settingButtonText,
                    boardSize === size && styles.settingButtonTextActive,
                  ]}>
                    {size}×{size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.targetsSection}>
          <View style={styles.targetsHeader}>
            <Text style={styles.sectionTitle}>{t('constructor.targets')}</Text>
            <TouchableOpacity style={styles.addButton} onPress={addTarget}>
              <Ionicons name="add" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View style={styles.targetsList}>
            {targets.map((target, index) => (
              <View key={index} style={[
                styles.targetBadge,
                testFoundTargets.has(target) && styles.targetFound
              ]}>
                <Text style={styles.targetText}>{target}</Text>
                {!isTestMode && (
                  <TouchableOpacity onPress={() => removeTarget(index)}>
                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {isTestMode && (
          <View style={styles.testInfo}>
            <Text style={styles.testExpression}>
              {testExpression || t('game.selectPath')}
              {testResult !== null && ` = ${testResult}`}
            </Text>
            <TouchableOpacity style={styles.confirmButton} onPress={confirmTestSelection}>
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.boardContainer, { width: 300, height: 300 }]}>
          {board.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.row}>
              {row.map((cell, colIndex) => {
                const isSelected = testSelectedCells.some(c => c.row === rowIndex && c.col === colIndex);
                return (
                  <TouchableOpacity
                    key={`${rowIndex}-${colIndex}`}
                    style={[
                      styles.cell,
                      { width: cellSize, height: cellSize },
                      cell.type === 'number' ? styles.numberCell : styles.operationCell,
                      isSelected && styles.selectedCell,
                    ]}
                    onPress={() => handleCellPress(rowIndex, colIndex)}
                  >
                    <Text style={[
                      styles.cellText,
                      cell.type === 'number' ? styles.numberText : styles.operationText,
                      isSelected && styles.selectedText,
                      { fontSize: boardSize <= 5 ? 20 : boardSize <= 10 ? 14 : 10 },
                    ]}>
                      {cell.value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          {isTestMode ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setIsTestMode(false);
                setTestSelectedCells([]);
                setTestExpression('');
                setTestResult(null);
              }}
            >
              <Text style={styles.cancelButtonText}>{t('settings.cancel')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.clearButton]}
                onPress={() => initializeBoard(boardSize)}
              >
                <Ionicons name="refresh" size={20} color="#f59e0b" />
                <Text style={styles.clearButtonText}>{t('constructor.clear')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.solveButton]}
                onPress={startTestMode}
              >
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                <Text style={styles.solveButtonText}>{t('constructor.solve')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {isSolved && (
          <View style={styles.solvedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.solvedText}>Solved! Ready to save</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showCellEditor} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedCell && board[selectedCell.row]?.[selectedCell.col]?.type === 'number' 
                ? 'Select Number' 
                : 'Select Operation'}
            </Text>
            
            <View style={styles.valueGrid}>
              {selectedCell && board[selectedCell.row]?.[selectedCell.col]?.type === 'number' ? (
                NUMBERS.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.valueButton}
                    onPress={() => updateCellValue(num)}
                  >
                    <Text style={styles.valueButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                OPERATIONS.map((op) => (
                  <TouchableOpacity
                    key={op}
                    style={styles.valueButton}
                    onPress={() => updateCellValue(op)}
                  >
                    <Text style={styles.valueButtonText}>{op}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setShowCellEditor(false);
                setSelectedCell(null);
              }}
            >
              <Text style={styles.closeButtonText}>{t('settings.cancel')}</Text>
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
    alignItems: 'center',
  },
  inputGroup: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 16,
  },
  settingsRow: {
    width: '100%',
    marginBottom: 16,
  },
  settingGroup: {
    gap: 8,
  },
  settingLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  settingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
  },
  settingButtonActive: {
    backgroundColor: '#3b82f6',
  },
  settingButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  settingButtonTextActive: {
    color: '#ffffff',
  },
  targetsSection: {
    width: '100%',
    marginBottom: 16,
  },
  targetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  targetFound: {
    backgroundColor: '#14532d',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  targetText: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  testInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    gap: 12,
  },
  testExpression: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  confirmButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  boardContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    margin: 1,
  },
  numberCell: {
    backgroundColor: '#334155',
  },
  operationCell: {
    backgroundColor: '#475569',
  },
  selectedCell: {
    backgroundColor: '#3b82f6',
  },
  cellText: {
    fontWeight: 'bold',
  },
  numberText: {
    color: '#f1f5f9',
  },
  operationText: {
    color: '#fbbf24',
  },
  selectedText: {
    color: '#ffffff',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
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
  clearButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  solveButton: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  clearButtonText: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  solveButtonText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14532d',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  solvedText: {
    color: '#86efac',
    fontWeight: '600',
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
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 20,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  valueButton: {
    width: 50,
    height: 50,
    backgroundColor: '#334155',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
  },
  closeButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
});
