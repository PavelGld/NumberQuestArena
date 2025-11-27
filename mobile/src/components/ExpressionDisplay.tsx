import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ExpressionDisplayProps {
  expression: string;
  result: number | null;
  t: (key: string) => string;
}

export const ExpressionDisplay: React.FC<ExpressionDisplayProps> = ({
  expression,
  result,
  t,
}) => {
  if (!expression) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholder}>{t('game.selectPath')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('game.currentSelection')}</Text>
      <View style={styles.expressionContainer}>
        <Text style={styles.expression}>{expression}</Text>
        {result !== null && (
          <>
            <Text style={styles.equals}>=</Text>
            <Text style={styles.result}>{result}</Text>
          </>
        )}
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
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  expressionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expression: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  equals: {
    fontSize: 24,
    color: '#64748b',
  },
  result: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22c55e',
  },
});
