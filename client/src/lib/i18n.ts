import { createContext, useContext } from 'react';

// Поддерживаемые языки приложения
export type Language = 'ru' | 'en';

// Тип контекста для системы интернационализации
export interface LanguageContextType {
  language: Language; // Текущий выбранный язык
  setLanguage: (lang: Language) => void; // Функция смены языка
  t: (key: string) => string; // Функция перевода по ключу
}

// Контекст React для передачи языковых настроек через компоненты
export const LanguageContext = createContext<LanguageContextType | null>(null);

/**
 * Хук для использования системы интернационализации
 * @returns Объект с текущим языком, функцией смены языка и функцией перевода
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Словарь переводов для поддерживаемых языков
export const translations = {
  ru: {
    'game.title': 'Арифметическая эстафета',
    'game.settings': 'Настройки',
    'game.giveUp': 'Сдаться',
    'game.newGame': 'Новая игра',
    'game.result': 'Результат',
    'game.board.title': 'Игровое поле',
    'game.status.playing': 'Игра идёт',
    'game.status.finished': 'Игра окончена',
    'game.targets.title': 'Найдите числа:',
    'game.progress.title': 'Прогресс',
    'game.progress.of': 'из',
    'game.stats.title': 'Статистика',
    'game.stats.attempts': 'Попыток',
    'game.stats.found': 'Найдено',
    'game.stats.remaining': 'Осталось',
    'game.solutions.title': 'Решения',
    'game.solutions.noSolutions': 'Не найдено решений для текущих целевых чисел.',
    'game.instructions.title': 'Как играть',
    'game.instructions.rule1': 'Выделяйте непрерывные линии (горизонтально или вертикально)',
    'game.instructions.rule2': 'Начинайте с числа, затем операция, затем число',
    'game.instructions.rule3': 'Найдите все целевые числа как можно быстрее',
    'game.instructions.rule4': 'Операции выполняются слева направо',
    'difficulty.easy': 'Легко',
    'difficulty.medium': 'Средне',
    'difficulty.hard': 'Сложно',
    'boardSize.5': '5×5',
    'boardSize.10': '10×10',
    'boardSize.15': '15×15',
    'victory.title': 'Поздравляем!',
    'victory.message': 'Вы нашли все числа!',
    'victory.yourTime': 'Ваше время',
    'victory.enterNickname': 'Введите ваш никнейм',
    'victory.nicknamePlaceholder': 'Ваш никнейм',
    'victory.saveResult': 'Сохранить результат',
    'leaderboard.title': 'Лидерборд',
    'leaderboard.difficulty': 'Сложность',
    'leaderboard.boardSize': 'Размер поля',
    'leaderboard.attempts': 'Попытки',
    'leaderboard.quickJump': 'Быстрый переход',
    'leaderboard.noResults': 'Пока нет результатов для этой категории',
    'leaderboard.beFirst': 'Будьте первым!',
    'settings.title': 'Настройки игры',
    'settings.difficulty': 'Сложность',
    'settings.boardSize': 'Размер поля',
    'settings.easyDesc': 'Легко (+, -, *)',
    'settings.mediumDesc': 'Средне (+, -, *, /)',
    'settings.hardDesc': 'Сложно (+, -, *, /, ^)',
    'settings.size5': '5×5 (4 цели)',
    'settings.size10': '10×10 (5 целей)',
    'settings.size15': '15×15 (7 целей)',
    'settings.cancel': 'Отмена',
    'settings.startGame': 'Начать игру',
    'toast.found': 'Отлично!',
    'toast.foundNumber': 'Вы нашли число',
    'game.currentSelection': 'Текущий выбор:',
    'game.selectPath': 'Выберите путь на поле',
    'game.invalidOperation': 'Некорректная операция',
    'game.divisionByZero': 'Деление на ноль недопустимо',
    'game.negativePower': 'Возведение отрицательного числа в степень недопустимо',
  },
  en: {
    'game.title': 'Arithmetic Relay',
    'game.settings': 'Settings',
    'game.giveUp': 'Give Up',
    'game.newGame': 'New Game',
    'game.result': 'Result',
    'game.board.title': 'Game Board',
    'game.status.playing': 'Game Running',
    'game.status.finished': 'Game Over',
    'game.targets.title': 'Find Numbers:',
    'game.progress.title': 'Progress',
    'game.progress.of': 'of',
    'game.stats.title': 'Statistics',
    'game.stats.attempts': 'Attempts',
    'game.stats.found': 'Found',
    'game.stats.remaining': 'Remaining',
    'game.solutions.title': 'Solutions',
    'game.solutions.noSolutions': 'No solutions found for current target numbers.',
    'game.instructions.title': 'How to Play',
    'game.instructions.rule1': 'Select continuous lines (horizontally or vertically)',
    'game.instructions.rule2': 'Start with a number, then operation, then number',
    'game.instructions.rule3': 'Find all target numbers as fast as possible',
    'game.instructions.rule4': 'Operations are performed left to right',
    'difficulty.easy': 'Easy',
    'difficulty.medium': 'Medium',
    'difficulty.hard': 'Hard',
    'boardSize.5': '5×5',
    'boardSize.10': '10×10',
    'boardSize.15': '15×15',
    'victory.title': 'Congratulations!',
    'victory.message': 'You found all numbers!',
    'victory.yourTime': 'Your Time',
    'victory.enterNickname': 'Enter your nickname',
    'victory.nicknamePlaceholder': 'Your nickname',
    'victory.saveResult': 'Save Result',
    'leaderboard.title': 'Leaderboard',
    'leaderboard.difficulty': 'Difficulty',
    'leaderboard.boardSize': 'Board Size',
    'leaderboard.attempts': 'Attempts',
    'leaderboard.quickJump': 'Quick Jump',
    'leaderboard.noResults': 'No results yet for this category',
    'leaderboard.beFirst': 'Be the first!',
    'settings.title': 'Game Settings',
    'settings.difficulty': 'Difficulty',
    'settings.boardSize': 'Board Size',
    'settings.easyDesc': 'Easy (+, -, *)',
    'settings.mediumDesc': 'Medium (+, -, *, /)',
    'settings.hardDesc': 'Hard (+, -, *, /, ^)',
    'settings.size5': '5×5 (4 targets)',
    'settings.size10': '10×10 (5 targets)',
    'settings.size15': '15×15 (7 targets)',
    'settings.cancel': 'Cancel',
    'settings.startGame': 'Start Game',
    'toast.found': 'Excellent!',
    'toast.foundNumber': 'You found number',
    'game.currentSelection': 'Current selection:',
    'game.selectPath': 'Select a path on the field',
    'game.invalidOperation': 'Invalid operation',
    'game.divisionByZero': 'Division by zero is not allowed',
    'game.negativePower': 'Raising negative number to power is not allowed',
  }
};