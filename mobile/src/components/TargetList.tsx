import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TargetListProps {
  targets: number[];
  foundTargets: Set<number>;
  t: (key: string) => string;
}

export const TargetList: React.FC<TargetListProps> = ({ targets, foundTargets, t }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('game.targets.title')}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.targetsContainer}
      >
        {targets.map((target, index) => {
          const isFound = foundTargets.has(target);
          return (
            <View
              key={index}
              style={[styles.targetBadge, isFound && styles.targetFound]}
            >
              {isFound && (
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={styles.checkIcon} />
              )}
              <Text style={[styles.targetText, isFound && styles.targetTextFound]}>
                {target}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  targetsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#475569',
  },
  targetFound: {
    backgroundColor: '#14532d',
    borderColor: '#22c55e',
  },
  checkIcon: {
    marginRight: 4,
  },
  targetText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f1f5f9',
  },
  targetTextFound: {
    color: '#86efac',
    textDecorationLine: 'line-through',
  },
});
