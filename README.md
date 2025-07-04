# Арифметическая эстафета / Arithmetic Relay

Интерактивная веб-игра-головоломка с математическими выражениями на поле в виде сетки. Игроки выбирают последовательности чисел и операций для достижения целевых значений.

## 📸 Скриншоты

<div align="center">

### Начальное состояние игры
*Компактное игровое поле с чередующимися числами (белые ячейки) и операциями (желтые ячейки). Выбранный путь подсвечивается синим цветом. Внизу показывается текущее выражение и его результат.*

![Игровое поле](./attached_assets/image_1749373368916.png)

---

### Таблица лидеров
*Система рейтингов с результатами игроков. Включает фильтры по сложности и размеру поля, а также быстрый переход между различными категориями.*

![Лидерборд](./attached_assets/image_1749374737340.png)

---

### Игровой процесс с выбранным путем
*Полноразмерное поле 5×5 с активным выбором пути. Синие ячейки показывают выбранную последовательность "2 + 2 * 7 = 28". Результат вычисления отображается справа.*

![Выбор пути](./attached_assets/image_1749374913339.png)

---

### Состояние с вертикальным выбором
*Демонстрация вертикального выбора ячеек. Показан процесс создания выражения с операцией сложения. Интерфейс отображает текущий выбор и промежуточные результаты.*

![Вертикальный выбор](./attached_assets/image_1749375123501.png)

</div>

## 🎮 Описание игры

Арифметическая эстафета — это математическая головоломка, где игроки:
- Выбирают непрерывные линии на игровом поле (горизонтально или вертикально)
- Создают математические выражения, чередуя числа и операции
- Ищут комбинации, результат которых равен целевым числам
- Соревнуются на время и количество попыток

### Особенности:
- 🌍 **Мультиязычность**: Поддержка русского и английского языков
- 📊 **Система лидерборда**: Сохранение результатов с фильтрацией по сложности и размеру поля
- 🎯 **Три уровня сложности**: 
  - Легкий (+, -, *)
  - Средний (+, -, *, /)
  - Сложный (+, -, *, /, ^)
- 📐 **Три размера поля**: 5×5, 10×10, 15×15
- 💡 **Система подсказок**: Возможность показать все решения
- ⚡ **Валидация операций**: Проверка деления на ноль и возведения отрицательных чисел в степень
- ⏱️ **Таймер**: Отслеживание времени прохождения
- 🎨 **Адаптивный дизайн**: Работа на всех устройствах

### Правила игры:
1. **Цель**: Найти на поле последовательности, которые при вычислении дают целевые числа
2. **Выбор пути**: Кликните и перетащите мышь по ячейкам (только по горизонтали или вертикали)
3. **Структура выражения**: Путь должен начинаться и заканчиваться числом, чередуя числа и операции
4. **Вычисление**: Операции выполняются слева направо без приоритетов
5. **Победа**: Найдите все целевые числа за минимальное время и количество попыток

## 🛠 Технологии

### Frontend:
- **React 18** с TypeScript
- **Vite** - сборщик и dev-сервер
- **Tailwind CSS** - стилизация
- **shadcn/ui** - компоненты интерфейса
- **TanStack Query** - управление состоянием сервера
- **React Hook Form** - работа с формами
- **Wouter** - роутинг
- **Lucide React** - иконки

### Backend:
- **Node.js** с TypeScript
- **Express.js** - веб-сервер
- **PostgreSQL** - база данных
- **Drizzle ORM** - работа с БД

### Инфраструктура:
- **WebSocket** поддержка для real-time обновлений
- Поддержка развертывания на любых облачных платформах

## 🚀 Локальная установка

### Предварительные требования:
- Node.js 18+ 
- PostgreSQL база данных
- npm или yarn

### Установка:

1. **Клонирование репозитория:**
```bash
git clone <repository-url>
cd arithmetic-relay
```

2. **Установка зависимостей:**
```bash
npm install
```

3. **Настройка базы данных:**
```bash
# Создайте PostgreSQL базу данных
# Скопируйте строку подключения в переменную окружения
export DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

4. **Применение схемы базы данных:**
```bash
npm run db:push
```

5. **Запуск в режиме разработки:**
```bash
npm run dev
```

Приложение будет доступно по адресу: `http://localhost:5000`

## 🌐 Развертывание на сервере

### Развертывание:

1. **Подготовка:**
```bash
npm run build
```

2. **Переменные окружения:**
```bash
DATABASE_URL=your_postgresql_connection_string
NODE_ENV=production
PORT=5000
```

3. **Запуск:**
```bash
npm start
```

### Поддерживаемые платформы:
- **Heroku** - добавьте `Procfile` с содержимым `web: npm start`
- **Vercel** - используйте `vercel.json` для конфигурации
- **Railway** - автоматическое развертывание из GitHub
- **DigitalOcean App Platform** - поддержка Node.js приложений
- **AWS Elastic Beanstalk** - развертывание Express приложений
- **Google Cloud Run** - контейнерное развертывание

## 📁 Структура проекта

```
├── client/                 # Frontend код
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── hooks/          # Пользовательские хуки
│   │   ├── lib/            # Утилиты и конфигурация
│   │   ├── pages/          # Страницы приложения
│   │   └── index.css       # Глобальные стили
├── server/                 # Backend код
│   ├── db.ts              # Настройка базы данных
│   ├── index.ts           # Основной сервер
│   ├── routes.ts          # API маршруты
│   ├── storage.ts         # Слой работы с данными
│   └── vite.ts            # Интеграция с Vite
├── shared/                 # Общий код
│   └── schema.ts          # Схемы базы данных и типы
├── package.json           # Зависимости и скрипты
├── tailwind.config.ts     # Конфигурация Tailwind
├── tsconfig.json          # Конфигурация TypeScript
└── vite.config.ts         # Конфигурация Vite
```

## 🎯 API Эндпоинты

- `GET /api/leaderboard` - Получение лидерборда
  - Параметры: `difficulty`, `boardSize`
- `POST /api/leaderboard` - Сохранение результата игры

## 🎨 Компоненты и функциональность

### Основные компоненты:
- **Game** (`client/src/pages/game.tsx`) - Основная игровая логика
- **LanguageProvider** - Система интернационализации
- **UI Components** - shadcn/ui компоненты для интерфейса

### Ключевые функции:
- `generateBoard()` - Генерация игрового поля
- `evaluateExpression()` - Вычисление математических выражений
- `findAllSolutions()` - Поиск всех возможных решений
- `handleCellSelection()` - Обработка выбора ячеек

## 🔧 Команды разработки

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Применение изменений схемы БД
npm run db:push

# Генерация типов БД
npm run db:generate

# Линтинг и форматирование
npm run lint
npm run format
```

## 🌍 Интернационализация

Проект поддерживает русский и английский языки:
- Файл переводов: `client/src/lib/i18n.ts`
- Переключение языка в интерфейсе
- Автоматическое сохранение выбранного языка

## 🐛 Обработка ошибок

- Валидация математических операций
- Проверка деления на ноль
- Проверка возведения отрицательных чисел в степень
- Уведомления пользователя об ошибках

## 📄 Лицензия

Проект лицензирован под [Apache License 2.0](LICENSE) - см. файл LICENSE для подробностей.

Copyright 2025 Arithmetic Relay Game

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## 👥 Разработка

Для участия в разработке:
1. Создайте форк репозитория
2. Создайте ветку для новой функции
3. Внесите изменения с комментариями
4. Создайте Pull Request

### Docker развертывание (опционально):

Создайте `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

И `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/arithmetic_relay
      - NODE_ENV=production
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=arithmetic_relay
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 🔗 Полезные ссылки

- [React документация](https://react.dev/)
- [Vite документация](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [shadcn/ui](https://ui.shadcn.com/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)