import { createContext, useContext } from 'react';

export type Language = 'ru' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const translations = {
  ru: {
    // Header
    'game.title': 'Арифметическая эстафета',
    'game.settings': 'Настройки',
    'game.newGame': 'Новая игра',
    'game.giveUp': 'Сдаться',
    
    // Game states
    'game.playing': 'Игра идёт',
    'game.finished': 'Игра окончена',
    'game.board': 'Игровое поле',
    
    // Targets
    'targets.title': 'Найдите числа:',
    'targets.progress': 'Прогресс:',
    'targets.found': 'из',
    
    // Stats
    'stats.title': 'Статистика',
    'stats.attempts': 'Попыток:',
    'stats.found': 'Найдено:',
    'stats.remaining': 'Осталось:',
    
    // Current selection
    'selection.current': 'Текущий выбор:',
    'selection.result': 'Результат',
    
    // Instructions
    'instructions.title': 'Как играть',
    'instructions.line1': '• Выделяйте непрерывные линии (горизонтально или вертикально)',
    'instructions.line2': '• Начинайте с числа, затем операция, затем число',
    'instructions.line3': '• Найдите все целевые числа как можно быстрее',
    'instructions.line4': '• Операции выполняются слева направо',
    
    // Solutions
    'solutions.title': 'Решения',
    'solutions.noSolutions': 'Не найдено решений для текущих целевых чисел.',
    
    // Victory modal
    'victory.title': 'Поздравляем!',
    'victory.message': 'Вы нашли все числа!',
    'victory.time': 'Время:',
    'victory.attempts': 'Попыток:',
    'victory.difficulty': 'Сложность:',
    'victory.boardSize': 'Размер поля:',
    'victory.nickname': 'Ваше имя:',
    'victory.save': 'Сохранить',
    'victory.saving': 'Сохранение...',
    'victory.playAgain': 'Играть снова',
    'victory.leaderboard': 'Лидерборд',
    
    // Leaderboard
    'leaderboard.title': 'Лидерборд',
    'leaderboard.difficulty': 'Сложность:',
    'leaderboard.boardSize': 'Размер поля:',
    'leaderboard.noResults': 'Пока нет результатов для этой категории',
    'leaderboard.beFirst': 'Будьте первым!',
    'leaderboard.quickJump': 'Быстрый переход:',
    'leaderboard.attempts': 'попыток',
    
    // Settings
    'settings.title': 'Настройки игры',
    'settings.difficulty': 'Сложность:',
    'settings.boardSize': 'Размер поля:',
    'settings.language': 'Язык:',
    'settings.save': 'Сохранить настройки',
    'settings.cancel': 'Отмена',
    
    // Difficulties
    'difficulty.easy': 'Легко',
    'difficulty.medium': 'Средне',
    'difficulty.hard': 'Сложно',
    
    // Board sizes
    'boardSize.5': '5×5',
    'boardSize.10': '10×10',
    'boardSize.15': '15×15',
    
    // Languages
    'language.ru': 'Русский',
    'language.en': 'English',
    
    // Toast messages
    'toast.found': 'Отлично!',
    'toast.foundNumber': 'Вы нашли число',
    'toast.scoreSaved': 'Результат сохранён!',
    'toast.errorSaving': 'Ошибка сохранения результата',
  },
  
  en: {
    // Header
    'game.title': 'Arithmetic Relay',
    'game.settings': 'Settings',
    'game.newGame': 'New Game',
    'game.giveUp': 'Give Up',
    
    // Game states
    'game.playing': 'Game In Progress',
    'game.finished': 'Game Finished',
    'game.board': 'Game Board',
    
    // Targets
    'targets.title': 'Find numbers:',
    'targets.progress': 'Progress:',
    'targets.found': 'of',
    
    // Stats
    'stats.title': 'Statistics',
    'stats.attempts': 'Attempts:',
    'stats.found': 'Found:',
    'stats.remaining': 'Remaining:',
    
    // Current selection
    'selection.current': 'Current selection:',
    'selection.result': 'Result',
    
    // Instructions
    'instructions.title': 'How to Play',
    'instructions.line1': '• Select continuous lines (horizontally or vertically)',
    'instructions.line2': '• Start with a number, then operation, then number',
    'instructions.line3': '• Find all target numbers as fast as possible',
    'instructions.line4': '• Operations are executed left to right',
    
    // Solutions
    'solutions.title': 'Solutions',
    'solutions.noSolutions': 'No solutions found for current target numbers.',
    
    // Victory modal
    'victory.title': 'Congratulations!',
    'victory.message': 'You found all numbers!',
    'victory.time': 'Time:',
    'victory.attempts': 'Attempts:',
    'victory.difficulty': 'Difficulty:',
    'victory.boardSize': 'Board Size:',
    'victory.nickname': 'Your name:',
    'victory.save': 'Save',
    'victory.saving': 'Saving...',
    'victory.playAgain': 'Play Again',
    'victory.leaderboard': 'Leaderboard',
    
    // Leaderboard
    'leaderboard.title': 'Leaderboard',
    'leaderboard.difficulty': 'Difficulty:',
    'leaderboard.boardSize': 'Board Size:',
    'leaderboard.noResults': 'No results yet for this category',
    'leaderboard.beFirst': 'Be the first!',
    'leaderboard.quickJump': 'Quick jump:',
    'leaderboard.attempts': 'attempts',
    
    // Settings
    'settings.title': 'Game Settings',
    'settings.difficulty': 'Difficulty:',
    'settings.boardSize': 'Board Size:',
    'settings.language': 'Language:',
    'settings.save': 'Save Settings',
    'settings.cancel': 'Cancel',
    
    // Difficulties
    'difficulty.easy': 'Easy',
    'difficulty.medium': 'Medium',
    'difficulty.hard': 'Hard',
    
    // Board sizes
    'boardSize.5': '5×5',
    'boardSize.10': '10×10',
    'boardSize.15': '15×15',
    
    // Languages
    'language.ru': 'Русский',
    'language.en': 'English',
    
    // Toast messages
    'toast.found': 'Great!',
    'toast.foundNumber': 'You found number',
    'toast.scoreSaved': 'Score saved!',
    'toast.errorSaving': 'Error saving score',
  }
};