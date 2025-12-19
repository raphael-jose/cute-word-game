class WordGame {
    constructor() {
        this.setupSounds();
        const savedSound = localStorage.getItem('wordGameSound') || 'on';
        if (savedSound === 'on') {
            this.sounds.background.play().catch(error => {
                console.log('Erro ao tocar música:', error);
            });
        } else {
            try { this.sounds.background.pause(); } catch {}
        }
        
        // Inicializa banco IndexedDB (fallback automático se não disponível)
        this.initDatabase().catch(() => {});
        
        // Verifica se existe jogo salvo antes de configurar a tela inicial
        const savedGame = localStorage.getItem('wordGameSave');
        const continueButton = document.getElementById('continue-game');
        
        if (savedGame) {
            continueButton.style.display = 'block';
        } else {
            continueButton.style.display = 'none';
        }
        
        // Inicializa variáveis de controle
        this.isShuffling = false; // Controla se está ocorrendo um embaralhamento
        this.achievements = new Set();
        this.stats = { levels: {} };
        
        this.setupStartScreen();
        this.setupTutorial();
        this.setupHamburgerMenu();
        this.autoLoadIfAvailable();
        this.renderEmojis(document.body);
    }
    
    renderEmojis(root = document.body) {
        try {
            if (window.twemoji && root) {
                twemoji.parse(root, {
                    base: 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/',
                    ext: '.png',
                    size: '72x72',
                    className: 'emoji'
                });
            }
        } catch {}
    }
 
    openTutorialModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal tutorial-modal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>Como Jogar 📝</h2>
                </div>
                <div class="level-modal-body">
                    <div class="tutorial-step">
                        <p>1. Encontre palavras na grade de letras 🔍</p>
                        <p>2. Clique e arraste para selecionar as letras ✨</p>
                        <p>3. As palavras podem estar em qualquer direção 🔄</p>
                        <p>4. Use dicas se precisar de ajuda 💡</p>
                        <p>5. Encontre todas as palavras para avançar de nível 🎮</p>
                        <p>6. Procure por surpresas especiais escondidas! 🎁</p>
                    </div>
                </div>
                <button class="next-level-button">Entendi! 👍</button>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
        setTimeout(() => modal.classList.add('show'), 100);
    }

    setupTutorial() {
        const howToPlayButton = document.getElementById('how-to-play');
        if (howToPlayButton) {
            howToPlayButton.style.display = 'none';
            howToPlayButton.addEventListener('click', () => this.openTutorialModal());
        }
    }

    setupStartScreen() {
        const startButton = document.getElementById('start-game');
        const continueButton = document.getElementById('continue-game');
        const levelSelect = document.getElementById('level-select');
        const buttonsWrap = document.querySelector('.start-buttons');
        
        // Preenche seletor com último nível salvo se existir
        const savedLocal = localStorage.getItem('wordGameSave');
        if (savedLocal && levelSelect) {
            try {
                const s = JSON.parse(savedLocal);
                if (s && s.level && s.level >= 1 && s.level <= 9) {
                    levelSelect.value = String(s.level);
                }
            } catch {}
        }
        // Tenta recuperar também do IndexedDB
        this.initDatabase().then(() => {
            this.loadStateFromDB().then(state => {
                if (state && levelSelect) {
                    levelSelect.value = String(state.level);
                }
            }).catch(() => {});
        }).catch(() => {});
        
        // Adiciona botão de Reset All
        
        startButton.addEventListener('click', async () => {
            let selectedLevel = 1;
            if (levelSelect && levelSelect.value) {
                const val = levelSelect.value;
                const isValidOption = Array.from(levelSelect.options).some(opt => opt.value === val);
                if (isValidOption) {
                    selectedLevel = parseInt(val, 10);
                } else {
                    // valor fora das opções visíveis: trata como Auto
                    levelSelect.value = '';
                }
            } else {
                // Se não selecionou nível, tenta usar o último salvo
                const savedGame = localStorage.getItem('wordGameSave');
                if (savedGame) {
                    try {
                        const gs = JSON.parse(savedGame);
                        if (gs && typeof gs.level === 'number') {
                            selectedLevel = gs.level;
                        }
                    } catch {}
                }
            }
            this.startGame(selectedLevel);
        });
        
        
        
        // Verifica se existe jogo salvo
        const savedGame = localStorage.getItem('wordGameSave');
        if (savedGame) {
            continueButton.style.display = 'block';
            continueButton.addEventListener('click', () => {
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('game-container').style.display = 'block';
                this.loadGame();
            });
            
            // Botão de reset movido para o menu hambúrguer
        } else {
            continueButton.style.display = 'none';
        }

        // controles flutuantes já são criados globalmente:
        // theme-button na esquerda, sound-button na direita

        // Moderniza e alinha os emojis do título da tela inicial
        const title = document.querySelector('h1');
        title.innerHTML = `<span class="emoji">🌸</span> <span class="title-text">Jogo do Jacaré Fofo</span> <span class="emoji secret-heart">💝</span> <span class="emoji">🌸</span>`;
        this.renderEmojis(document.querySelector('.start-content'));

        document.querySelector('.secret-heart').addEventListener('click', () => {
            const heart = document.querySelector('.secret-heart');
            if (heart) {
                heart.classList.add('pulse');
                setTimeout(() => heart.classList.remove('pulse'), 300);
            }
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            
            // Inicializa o jogo no último nível
            this.board = [];
            this.selectedTiles = [];
            this.score = 0;
            this.boardSize = 6;
            this.letters = 'AEIOUÁÉÍÓÚÃÕÇBCDFGHJKLMNPQRSTVWXYZ';
            this.currentLevel = 15; // Último nível
            this.levels = this.createLevels();
            this.wordsPerLevel = this.levels[this.currentLevel].length;
            this.wordsFound = 0;
            this.hintsRemaining = 50;
            
            this.init();
            this.setupHamburgerMenu();
        });
    }

    startGame(level = 1) {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        // Inicializar o jogo
        this.board = [];
        this.selectedTiles = [];
        this.score = 0;
        this.boardSize = 6;
        this.letters = 'AEIOUÁÉÍÓÚÃÕÇBCDFGHJKLMNPQRSTVWXYZ';
        this.currentLevel = level;
        this.levels = this.createLevels();
        this.wordsPerLevel = this.levels[this.currentLevel].length;
        this.wordsFound = 0;
        this.hintsRemaining = 50;
        this.levelStartTime = Date.now();
        this.hintsUsedThisLevel = 0;
        this.wordsFoundThisLevel = 0;
        
        this.init();
        this.setupHamburgerMenu();
    }

    setupSounds() {
        // Sons normais do jogo
        this.sounds = {
            select: new Audio('./sounds/select.mp3'),
            success: new Audio('./sounds/success.mp3'),
            levelUp: new Audio('./sounds/levelup.mp3'),
            easterEgg: new Audio('./sounds/easteregg.mp3'),
            background: new Audio('./sounds/background.mp3')
        };

        // Ajustar volumes individuais
        this.sounds.select.volume = 0.8;  // Aumentado volume do clique
        this.sounds.success.volume = 0.5;
        this.sounds.levelUp.volume = 0.5;
        this.sounds.easterEgg.volume = 0.5;
        this.sounds.background.volume = 0.2; // Diminuído volume da música

        // Preload para reduzir latência
        this.sounds.select.preload = 'auto';
        this.sounds.success.preload = 'auto';
        this.sounds.levelUp.preload = 'auto';
        this.sounds.easterEgg.preload = 'auto';
        this.sounds.background.preload = 'auto';

        // Configurar música de fundo
        this.sounds.background.loop = true;
        
        // Iniciar música automaticamente
        const startBackgroundMusic = () => {
            const savedSound = localStorage.getItem('wordGameSound') || 'on';
            if (savedSound === 'on') {
                this.sounds.background.play().catch(error => {
                    console.log('Erro ao tocar música:', error);
                });
            }
        };

        // Tentar iniciar a música quando houver qualquer interação
        document.addEventListener('click', startBackgroundMusic, { once: true });
        document.addEventListener('touchstart', startBackgroundMusic, { once: true });
    }

    setupSoundControls() {
        if (document.querySelector('.sound-button')) return;
        if (document.querySelector('.hamburger-button')) return;
        const soundButton = document.createElement('button');
        soundButton.className = 'sound-button';
        const savedSound = localStorage.getItem('wordGameSound') || 'on';
        const isPlaying = savedSound === 'on' && !this.sounds.background.paused;
        soundButton.innerHTML = isPlaying ? '🔊' : '🔈';
        if (isPlaying) soundButton.classList.add('playing');
        const toggleMusic = () => {
            try {
                if (this.sounds.background.paused) {
                    this.sounds.background.play();
                    soundButton.innerHTML = '🔊';
                    soundButton.classList.add('playing');
                    localStorage.setItem('wordGameSound', 'on');
                } else {
                    this.sounds.background.pause();
                    soundButton.innerHTML = '🔈';
                    soundButton.classList.remove('playing');
                    localStorage.setItem('wordGameSound', 'off');
                }
            } catch (error) {
                console.log('Erro ao controlar música:', error);
            }
        };
        soundButton.addEventListener('click', toggleMusic);
        document.body.appendChild(soundButton);
    }

    setupHamburgerMenu() {
        if (document.querySelector('.hamburger-button')) return;
        const savedTheme = localStorage.getItem('wordGameTheme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        const savedSound = localStorage.getItem('wordGameSound') || 'on';
        const button = document.createElement('button');
        button.className = 'hamburger-button';
        button.innerHTML = '☰';
        const panel = document.createElement('div');
        panel.className = 'hamburger-panel';
        const themeLabel = document.body.classList.contains('dark-mode') ? '☀️ Claro' : '🌙 Escuro';
        const soundLabel = savedSound === 'on' ? '🔊 Música' : '🔈 Música';
        panel.innerHTML = `
            <button class="menu-item theme-toggle">${themeLabel}</button>
            <button class="menu-item sound-toggle">${soundLabel}</button>
            <button class="menu-item how-to-play">📝 Como Jogar</button>
            <button class="menu-item reset-progress">🗑️ Zerar Progresso</button>
        `;
        button.addEventListener('click', () => {
            panel.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!panel.contains(e.target) && !button.contains(e.target)) {
                panel.classList.remove('show');
            }
        });
        panel.querySelector('.theme-toggle').addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('wordGameTheme', isDark ? 'dark' : 'light');
            panel.querySelector('.theme-toggle').textContent = isDark ? '☀️ Claro' : '🌙 Escuro';
        });
        panel.querySelector('.sound-toggle').addEventListener('click', () => {
            try {
                if (this.sounds.background.paused) {
                    this.sounds.background.play();
                    localStorage.setItem('wordGameSound', 'on');
                    panel.querySelector('.sound-toggle').textContent = '🔊 Música';
                } else {
                    this.sounds.background.pause();
                    localStorage.setItem('wordGameSound', 'off');
                    panel.querySelector('.sound-toggle').textContent = '🔈 Música';
                }
            } catch {}
        });
        panel.querySelector('.how-to-play').addEventListener('click', () => {
            this.openTutorialModal();
        });
        panel.querySelector('.reset-progress').addEventListener('click', () => {
            const continueButton = document.getElementById('continue-game');
            this.showConfirmModal(
                '🚨 Reset All Progress',
                'Você tem certeza que deseja resetar todo o progresso? Isso não pode ser desfeito!',
                () => {
                    localStorage.removeItem('wordGameSave');
                    if (continueButton) continueButton.style.display = 'none';
                    this.showMessageModal('✅ Progresso Resetado', 'Todo o progresso foi resetado com sucesso!');
                }
            );
        });
        document.body.appendChild(button);
        document.body.appendChild(panel);
    }

    // ===== CHECKPOINT - VERSÃO ESTÁVEL - 19/12/2025 =====
    // Auto-carregamento, Modo Escuro, Estatísticas e Conquistas
    // Embaralhamento automático quando não há opções válidas
    // ==========================================================
    
    createLevels() {
        // Easter Eggs separados
        this.easterEggs = {
            'JACARE': '🐊 Você encontrou o Jacaré mais fofo e cabeçudo do mundo',
            'PANDA': '🐑🐏 BÉÉÉ 🐑🐏'
        };

        return {
            1: ['FLOR', 'BEM', 'PAZ', 'SOL', 'MAR', 'LUZ'],
            2: ['GATO', 'CÃO', 'TODDY', 'PATA', 'RABO', 'PELO'],
            3: ['CUBO', 'DADO', 'PIAO', 'PIPA', 'URSO', 'PANDA'],
            4: ['PRAIA', 'SOL', 'MAR', 'JACARE', 'ONDA', 'AREIA'],
            5: ['MUSICA', 'SOM', 'VOZ', 'NOTA', 'TOM', 'RITMO'],
            6: ['PULAR', 'IDIOTA', 'NADAR', 'VOAR', 'LUTAR', 'JOGAR'],
            7: ['CANTAR', 'TOCAR', 'DANÇA', 'CANTO', 'CORO', 'SAMBA'],
            8: ['POEMA', 'PAGINA', 'LER', 'MONTEZ', 'AUTOR', 'CONTO'],
            9: ['FILME', 'SERIE', 'CENA', 'ATOR', 'ATO', 'CURTA'],
            10: ['BOLO', 'TAYLOR', 'QUEIJO', 'OVO', 'ARROZ', 'FEIJAO'],
            11: ['PESCA', 'AMIGAS', 'CHUVA', 'VELA', 'PORTO', 'BARCO'],
            12: ['PESO', 'BARRA', 'SUPINO', 'ROSCA', 'REMADA', 'BICEPS'],
            13: ['AULA', 'LIVRO', 'LAPIS', 'PAPEL', 'CANETA', 'MESA'],
            14: ['PAI', 'MÃE', 'IRMÃ', 'CASA', 'AMOR', 'FELIZ'],
            15: ['CAROL', 'ACEITA', 'NAMORA', 'COMIGO']
        };
    }

    init() {
        this.createBoard();
        this.setupEventListeners();
        this.updateScore();
        this.updateLevelInfo();
        this.createWordList();
        this.setupHintButton();
        this.setupClearButton();
        this.setupGameControls();
        this.setupWordAvailabilityChecker();
        
        // Moderniza e alinha os emojis do título do jogo
        const gameHeaderTitle = document.querySelector('.game-header h1');
        if (gameHeaderTitle) {
            gameHeaderTitle.innerHTML = `<span class="emoji">🌸</span> <span class="title-text">Jogo do Jacaré Fofo</span> <span class="emoji">🌸</span>`;
            this.renderEmojis(document.querySelector('.game-header'));
        }
    }

    createBoard() {
        const gameBoard = document.querySelector('.game-board');
        if (!gameBoard) return;
        
        gameBoard.innerHTML = '';
        
        const createNewBoard = () => {
            const board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
            const words = this.levels[this.currentLevel] || [];
            
            // Se não houver palavras, preenche com letras aleatórias
            if (words.length === 0) {
                for (let i = 0; i < this.boardSize; i++) {
                    for (let j = 0; j < this.boardSize; j++) {
                        board[i][j] = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                    }
                }
                return { board, allWordsPlaced: true };
            }
            
            const remainingWords = words.filter(word => {
                if (typeof word !== 'string') return false;
                const wordElement = document.querySelector(`[data-word="${word}"]`);
                return !wordElement || !wordElement.classList.contains('found');
            });

            // Ordena as palavras da maior para a menor (mais difícil de colocar primeiro)
            remainingWords.sort((a, b) => b.length - a.length);
            
            let allWordsPlaced = true;
            
            // Tenta colocar primeiro as palavras que faltam
            for (const word of remainingWords) {
                if (word && typeof word === 'string') {
                    if (!this.placeWordOnBoard(word, board)) {
                        console.warn(`Não foi possível colocar a palavra: ${word}`);
                        allWordsPlaced = false;
                        // Continua mesmo se não conseguir colocar a palavra
                    }
                }
            }

            // Preenche espaços vazios
            for (let i = 0; i < this.boardSize; i++) {
                for (let j = 0; j < this.boardSize; j++) {
                    if (board[i][j] === '') {
                        board[i][j] = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                    }
                }
            }
            
            return { board, allWordsPlaced };
        };

        let attempts = 0;
        const maxAttempts = 10; // Aumentei o número de tentativas
        let bestBoard = null;
        let bestWordCount = 0;

        while (attempts < maxAttempts) {
            const result = createNewBoard();
            if (result) {
                const { board, allWordsPlaced } = result;
                const placedWordCount = this.countPlacedWords(board);
                
                // Se conseguiu colocar todas as palavras, usa este tabuleiro
                if (allWordsPlaced) {
                    this.renderBoard(board);
                    this.checkAvailableWords();
                    return;
                }
                
                // Senão, mantém o melhor tabuleiro encontrado até agora
                if (placedWordCount > bestWordCount) {
                    bestBoard = board;
                    bestWordCount = placedWordCount;
                }
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                this.showShuffleMessage();
            }
        }

        // Se chegou aqui, não conseguiu colocar todas as palavras
        if (bestBoard) {
            console.log(`Usando melhor tabuleiro encontrado (${bestWordCount} de ${this.wordsPerLevel} palavras)`);
            this.renderBoard(bestBoard);
            this.shuffleBoard();
            this.checkAvailableWords();
        } else {
            console.log("Usando tabuleiro de emergência");
            this.renderBoard(this.createEmergencyBoard());
            this.shuffleBoard();
            this.checkAvailableWords();
        }
    }
    
    // Conta quantas palavras do nível atual estão no tabuleiro
    countPlacedWords(board) {
        const words = this.levels[this.currentLevel] || [];
        let count = 0;
        
        for (const word of words) {
            if (this.isWordOnBoard(word, board)) {
                count++;
            }
        }
        
        return count;
    }
    
    // Verifica se uma palavra está no tabuleiro
    isWordOnBoard(word, board) {
        const directions = [
            [0, 1],   // direita
            [1, 0],   // baixo
            [1, 1],   // diagonal direita-baixo
            [1, -1],  // diagonal direita-cima
            [0, -1],  // esquerda
            [-1, 0],  // cima
            [-1, -1], // diagonal esquerda-cima
            [-1, 1]   // diagonal esquerda-baixo
        ];
        
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                for (const [dx, dy] of directions) {
                    let found = true;
                    
                    for (let i = 0; i < word.length; i++) {
                        const currentRow = row + (dx * i);
                        const currentCol = col + (dy * i);
                        
                        if (currentRow < 0 || currentRow >= this.boardSize || 
                            currentCol < 0 || currentCol >= this.boardSize || 
                            board[currentRow][currentCol] !== word[i]) {
                            found = false;
                            break;
                        }
                    }
                    
                    if (found) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    renderBoard(board) {
        const gameBoard = document.querySelector('.game-board');
        gameBoard.innerHTML = '';

        for (let i = 0; i < this.boardSize; i++) {
            for (let j = 0; j < this.boardSize; j++) {
                const tile = document.createElement('button');
                tile.className = 'letter-tile';
                tile.dataset.row = i;
                tile.dataset.col = j;
                tile.textContent = board[i][j];
                gameBoard.appendChild(tile);
            }
        }
        this.board = board;
    }

    createEmergencyBoard() {
        const board = Array(this.boardSize).fill().map(() => 
            Array(this.boardSize).fill('').map(() => 
                this.letters.charAt(Math.floor(Math.random() * this.letters.length))
            )
        );
        return board;
    }

    placeWordOnBoard(word, board) {
        const directions = [
            [0, 1],   // direita
            [1, 0],   // baixo
            [1, 1],   // diagonal direita-baixo
            [1, -1],  // diagonal direita-cima
            [0, -1],  // esquerda
            [-1, 0],  // cima
            [-1, -1], // diagonal esquerda-cima
            [-1, 1]   // diagonal esquerda-baixo
        ];

        // Primeiro, tenta todas as direções para cada posição
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                // Embaralha as direções para maior aleatoriedade
                const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);
                
                for (const direction of shuffledDirections) {
                    if (this.canPlaceWord(word, row, col, direction, board)) {
                        // Encontrou uma posição válida, coloca a palavra
                        for (let i = 0; i < word.length; i++) {
                            const currentRow = row + (direction[0] * i);
                            const currentCol = col + (direction[1] * i);
                            board[currentRow][currentCol] = word[i];
                        }
                        return true;
                    }
                }
            }
        }
        
        // Se não encontrou uma posição, tenta forçar a colocação sobrepondo letras
        for (let attempts = 0; attempts < 100; attempts++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * (this.boardSize - word.length * Math.abs(direction[0])));
            const startCol = Math.floor(Math.random() * (this.boardSize - word.length * Math.abs(direction[1])));
            
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
                const currentRow = startRow + (direction[0] * i);
                const currentCol = startCol + (direction[1] * i);
                
                if (currentRow < 0 || currentRow >= this.boardSize || 
                    currentCol < 0 || currentCol >= this.boardSize) {
                    canPlace = false;
                    break;
                }
                
                const cell = board[currentRow][currentCol];
                if (cell !== '' && cell !== word[i]) {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                for (let i = 0; i < word.length; i++) {
                    const currentRow = startRow + (direction[0] * i);
                    const currentCol = startCol + (direction[1] * i);
                    board[currentRow][currentCol] = word[i];
                }
                return true;
            }
        }
        
        return false;
    }

    canPlaceWord(word, startRow, startCol, [dx, dy], board) {
        if (startRow < 0 || startCol < 0) return false;
        
        for (let i = 0; i < word.length; i++) {
            const row = startRow + (dx * i);
            const col = startCol + (dy * i);
            
            if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
                return false;
            }
            
            if (board[row][col] !== '' && board[row][col] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    setupEventListeners() {
        document.querySelector('.game-board').addEventListener('click', (e) => {
            const tile = e.target.closest('.letter-tile');
            if (tile) {
                this.handleTileClick(tile);
            }
        });
    }

    createWordList() {
        const container = document.querySelector('.container');

        // Remove listas e toggles antigos para não duplicar
        document.querySelectorAll('.word-list, .word-list-toggle').forEach(el => el.remove());

        // Criar botão toggle para mobile
        const toggleButton = document.createElement('button');
        toggleButton.className = 'word-list-toggle';
        toggleButton.innerHTML = '📝 Ver Palavras';
        
        const wordList = document.createElement('div');
        wordList.className = 'word-list';
        wordList.innerHTML = `
            <ul>
                ${this.levels[this.currentLevel].map(word => 
                    `<li data-word="${word}">${word}</li>`
                ).join('')}
            </ul>
        `;
        
        // Adicionar evento de toggle
        toggleButton.addEventListener('click', () => {
            wordList.classList.toggle('show');
            toggleButton.classList.toggle('active');
            toggleButton.innerHTML = wordList.classList.contains('show') ? '❌ Fechar' : '📝 Ver Palavras';
        });
        
        container.appendChild(toggleButton);
        container.appendChild(wordList);
    }

    highlightWord(word) {
        // Primeiro, encontra a palavra no tabuleiro
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const directions = [
                    [0, 1],   // direita
                    [1, 0],   // baixo
                    [1, 1],   // diagonal direita-baixo
                    [1, -1],  // diagonal direita-cima
                    [0, -1],  // esquerda
                    [-1, 0],  // cima
                    [-1, -1], // diagonal esquerda-cima
                    [-1, 1]   // diagonal esquerda-baixo
                ];

                for (const [dx, dy] of directions) {
                    if (this.canWordBeFoundFromPosition(word, row, col)) {
                        // Encontrou a palavra, adiciona os números
                        for (let i = 0; i < word.length; i++) {
                            const currentRow = row + (dx * i);
                            const currentCol = col + (dy * i);
                            const tile = document.querySelector(
                                `.letter-tile[data-row="${currentRow}"][data-col="${currentCol}"]`
                            );
                            
                            if (tile) {
                                // Adiciona o número da ordem
                                const orderNumber = document.createElement('div');
                                orderNumber.className = 'letter-order';
                                orderNumber.textContent = i + 1;
                                tile.appendChild(orderNumber);
                                
                                // Adiciona classe para highlight
                                tile.classList.add('hint-highlight');
                                
                                // Remove após alguns segundos
                                setTimeout(() => {
                                    orderNumber.remove();
                                    tile.classList.remove('hint-highlight');
                                }, 3000);
                            }
                        }
                        return; // Sai após encontrar e marcar a palavra
                    }
                }
            }
        }
    }

    checkWordAt(row, col, word, dx, dy) {
        if (row < 0 || col < 0 || row >= this.boardSize || col >= this.boardSize) return false;
        
        for (let i = 0; i < word.length; i++) {
            const newRow = row + i * dx;
            const newCol = col + i * dy;
            
            if (newRow < 0 || newCol < 0 || newRow >= this.boardSize || newCol >= this.boardSize) return false;
            
            const tile = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
            if (tile.textContent !== word[i]) return false;
        }
        return true;
    }

    highlightWordAt(row, col, length, dx, dy) {
        for (let i = 0; i < length; i++) {
            const newRow = row + i * dx;
            const newCol = col + i * dy;
            const tile = document.querySelector(`[data-row="${newRow}"][data-col="${newCol}"]`);
            tile.classList.add('highlight');
        }
    }

    updateLevelInfo() {
        const levelInfo = document.querySelector('.level-info') || document.createElement('div');
        levelInfo.className = 'level-info';
        levelInfo.innerHTML = `Nível ${this.currentLevel} - Palavras encontradas: ${this.wordsFound}/${this.wordsPerLevel}`;
        levelInfo.setAttribute('aria-live', 'polite');
        
        if (!document.querySelector('.level-info')) {
            document.querySelector('.game-header').appendChild(levelInfo);
        }
    }

    handleTileClick(tile) {
        const row = parseInt(tile.dataset.row);
        const col = parseInt(tile.dataset.col);

        if (this.isValidSelection(row, col)) {
            // Tocar som ao selecionar
            if (!tile.classList.contains('selected')) {
                this.sounds.select.currentTime = 0;
                this.sounds.select.play();
            }

            tile.classList.toggle('selected');
            
            if (tile.classList.contains('selected')) {
                this.selectedTiles.push(tile);
            } else {
                this.selectedTiles = this.selectedTiles.filter(t => t !== tile);
            }
            
            this.drawLine();
            this.updateCurrentWord();

            // Verificar a palavra atual
            const currentWord = this.selectedTiles.map(tile => tile.textContent).join('');
            
            // Verificar Easter Eggs
            if (this.easterEggs && this.easterEggs[currentWord]) {
                this.showEasterEggModal(currentWord);
                return;
            }

            // Verificar se a palavra está na lista do nível atual
            if (this.levels[this.currentLevel].includes(currentWord)) {
                const wordElement = document.querySelector(`[data-word="${currentWord}"]`);
                if (wordElement && !wordElement.classList.contains('found')) {
                    this.sounds.success.currentTime = 0;
                    this.sounds.success.play();
                    wordElement.classList.add('found');
                    this.wordsFound++;
                    this.wordsFoundThisLevel = (this.wordsFoundThisLevel || 0) + 1;
                    this.score += currentWord.length * 10;
                    this.updateScore();
                    this.updateLevelInfo();

                    // Limpar seleções e highlights imediatamente
                    document.querySelectorAll('.letter-tile').forEach(tile => {
                        tile.classList.remove('highlight');
                    });

                    // Efeito de sucesso nas letras selecionadas
                    this.selectedTiles.forEach(tile => {
                        tile.classList.add('success');
                        setTimeout(() => {
                            tile.classList.remove('success');
                            tile.classList.remove('selected');
                            const newLetter = this.letters.charAt(
                                Math.floor(Math.random() * this.letters.length)
                            );
                            tile.textContent = newLetter;
                        }, 500);
                    });

                    // Limpar seleção após o efeito
                    setTimeout(() => {
                        this.selectedTiles = [];
                        this.updateCurrentWord();
                        document.querySelectorAll('.connection-line').forEach(line => line.remove());

                        if (this.wordsFound === this.wordsPerLevel) {
                            this.nextLevel();
                        }
                    }, 600);
                }
            }
        }
    }

    isValidSelection(row, col) {
        if (this.selectedTiles.length === 0) return true;
        
        const lastTile = this.selectedTiles[this.selectedTiles.length - 1];
        const lastRow = parseInt(lastTile.dataset.row);
        const lastCol = parseInt(lastTile.dataset.col);
        
        return Math.abs(row - lastRow) <= 1 && Math.abs(col - lastCol) <= 1;
    }

    updateCurrentWord() {
        // Pega apenas o texto das letras, ignorando os números do hint
        const word = this.selectedTiles.map(tile => {
            // Se tiver um número do hint, pega apenas o texto principal
            const textNode = Array.from(tile.childNodes).find(node => 
                node.nodeType === Node.TEXT_NODE
            );
            return textNode ? textNode.textContent : tile.textContent;
        }).join('');
        
        document.getElementById('current-word').textContent = word;
    }

    drawLine() {
        document.querySelectorAll('.connection-line').forEach(line => line.remove());
        
        if (this.selectedTiles.length < 2) return;

        for (let i = 1; i < this.selectedTiles.length; i++) {
            const line = document.createElement('div');
            line.className = 'connection-line';
            
            const tile1 = this.selectedTiles[i-1].getBoundingClientRect();
            const tile2 = this.selectedTiles[i].getBoundingClientRect();
            
            const gameBoard = document.querySelector('.game-board').getBoundingClientRect();
            
            const x1 = tile1.left + tile1.width/2 - gameBoard.left;
            const y1 = tile1.top + tile1.height/2 - gameBoard.top;
            const x2 = tile2.left + tile2.width/2 - gameBoard.left;
            const y2 = tile2.top + tile2.height/2 - gameBoard.top;
            
            const length = Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
            const angle = Math.atan2(y2-y1, x2-x1) * 180/Math.PI;
            
            line.style.width = `${length}px`;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${angle}deg)`;
            
            document.querySelector('.game-board').appendChild(line);
        }
    }

    checkWord() {
        const word = this.selectedTiles.map(tile => {
            const textNode = Array.from(tile.childNodes).find(node => 
                node.nodeType === Node.TEXT_NODE
            );
            return textNode ? textNode.textContent : tile.textContent;
        }).join('');
        
        if (this.easterEggs && this.easterEggs[word]) {
            this.sounds.easterEgg.play();
            this.showEasterEggModal(word);
            return;
        }
        
        if (this.levels[this.currentLevel].includes(word)) {
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            if (wordElement && !wordElement.classList.contains('found')) {
                this.sounds.success.currentTime = 0;
                this.sounds.success.play();
                wordElement.classList.add('found');
                this.wordsFound++;
                this.wordsFoundThisLevel = (this.wordsFoundThisLevel || 0) + 1;
                this.score += word.length * 10;
                this.updateScore();
                this.updateLevelInfo();
                
                this.selectedTiles.forEach(tile => {
                    tile.classList.add('success');
                    setTimeout(() => {
                        tile.classList.remove('success');
                        tile.classList.remove('selected');
                        const newLetter = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                        tile.textContent = newLetter;
                        const row = parseInt(tile.dataset.row, 10);
                        const col = parseInt(tile.dataset.col, 10);
                        if (!isNaN(row) && !isNaN(col) && this.board && this.board[row]) {
                            this.board[row][col] = newLetter;
                        }
                    }, 500);
                });

                setTimeout(() => {
                    this.selectedTiles = [];
                    this.updateCurrentWord();
                    document.querySelectorAll('.connection-line').forEach(line => line.remove());
                    
                    if (this.wordsFound >= this.wordsPerLevel) {
                        if (this.currentLevel === 15) {
                            this.nextLevel();
                        } else {
                            this.showLevelCompleteModal();
                        }
                    }
                }, 600);
            }
        }
    }

    nextLevel() {
        if (this.currentLevel === 15) {
            this.showGameCompleteModal();
        } else {
            this.showLevelCompleteModal();
        }
    }

    updateScore() {
        const el = document.getElementById('score');
        el.textContent = this.score;
        el.setAttribute('aria-live', 'polite');
    }

    setupHintButton() {
        // Evita duplicar botão de dica
        if (document.getElementById('hint-button')) return;

        const hintButton = document.createElement('button');
        hintButton.id = 'hint-button';
        hintButton.className = 'hint-button';
        hintButton.innerHTML = `💡 Dica (${this.hintsRemaining})`;
        
        hintButton.addEventListener('click', () => {
            this.useHint();
        });
        
        document.querySelector('.game-header').appendChild(hintButton);
    }

    useHint() {
        if (this.hintsRemaining <= 0) {
            alert('Não há mais dicas disponíveis! 🌸');
            return;
        }
        
        this.hintsUsedThisLevel = (this.hintsUsedThisLevel || 0) + 1;

        // Pega todas as palavras que ainda não foram encontradas
        const words = this.levels[this.currentLevel];
        const remainingWords = words.filter(word => {
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            return !wordElement.classList.contains('found');
        });

        // Evita escolher palavras maiores que o tabuleiro
        const candidateWords = remainingWords.filter(w => typeof w === 'string' && w.length <= this.boardSize);

        if (candidateWords.length === 0) {
            alert('Você encontrou todas as palavras neste nível! 🎉');
            return;
        }

        // Escolhe uma palavra aleatória das restantes e compatíveis
        const randomWord = candidateWords[Math.floor(Math.random() * candidateWords.length)];
        
        // Procura a palavra no tabuleiro
        let found = false;
        let tiles = [];

        // Procura em cada posição do tabuleiro
        for (let startRow = 0; startRow < this.boardSize && !found; startRow++) {
            for (let startCol = 0; startCol < this.boardSize && !found; startCol++) {
                // Verifica cada direção possível
                const directions = [
                    [0, 1],   // direita
                    [1, 0],   // baixo
                    [1, 1],   // diagonal direita-baixo
                    [1, -1],  // diagonal direita-cima
                    [0, -1],  // esquerda
                    [-1, 0],  // cima
                    [-1, -1], // diagonal esquerda-cima
                    [-1, 1]   // diagonal esquerda-baixo
                ];

                for (const [dx, dy] of directions) {
                    // Verifica se a palavra pode ser formada nesta direção
                    let isValid = true;
                    let currentTiles = [];

                    for (let i = 0; i < randomWord.length; i++) {
                        const row = startRow + (dx * i);
                        const col = startCol + (dy * i);

                        // Verifica se está dentro do tabuleiro
                        if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
                            isValid = false;
                            break;
                        }

                        // Pega a letra atual
                        const tile = document.querySelector(
                            `.letter-tile[data-row="${row}"][data-col="${col}"]`
                        );

                        if (!tile || tile.textContent !== randomWord[i]) {
                            isValid = false;
                            break;
                        }

                        currentTiles.push(tile);
                    }

                    if (isValid && currentTiles.length === randomWord.length) {
                        found = true;
                        tiles = currentTiles;
                        break;
                    }
                }
            }
        }

        if (found && tiles.length === randomWord.length) {
            // Remove números anteriores se houver
            document.querySelectorAll('.letter-order').forEach(num => num.remove());
            document.querySelectorAll('.hint-highlight').forEach(tile => 
                tile.classList.remove('hint-highlight')
            );

            // Adiciona os números em ordem
            tiles.forEach((tile, index) => {
                const orderNumber = document.createElement('div');
                orderNumber.className = 'letter-order';
                orderNumber.textContent = index + 1;
                tile.appendChild(orderNumber);
                tile.classList.add('hint-highlight');
            });

            // Remove após 3 segundos
            setTimeout(() => {
                tiles.forEach(tile => {
                    const orderNumber = tile.querySelector('.letter-order');
                    if (orderNumber) orderNumber.remove();
                    tile.classList.remove('hint-highlight');
                });
            }, 3000);
        } else {
            // Se não encontrou a palavra, faz shuffle
            this.shuffleBoard();
        }

        this.hintsRemaining--;
        document.getElementById('hint-button').innerHTML = `💡 Dica (${this.hintsRemaining})`;
    }

    shuffleBoard() {
        if (this.isShuffling) return;
        this.isShuffling = true;
        this.showShuffleMessage();
        setTimeout(() => this.actuallyShuffle(), 1000);
    }

    actuallyShuffle() {
        // Cria novo tabuleiro garantindo que as palavras não encontradas estejam presentes
        const words = this.levels[this.currentLevel];
        const remainingWords = words.filter(word => {
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            return !wordElement.classList.contains('found');
        });

        const board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
        
        // Tenta colocar cada palavra restante
        let allPlaced = true;
        for (const word of remainingWords) {
            if (!this.placeWordOnBoard(word, board)) {
                allPlaced = false;
                break;
            }
        }

        // Se conseguiu colocar todas as palavras, preenche o resto com letras aleatórias
        if (allPlaced) {
            for (let i = 0; i < this.boardSize; i++) {
                for (let j = 0; j < this.boardSize; j++) {
                    if (board[i][j] === '') {
                        board[i][j] = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                    }
                }
            }
            this.board = board;
            this.renderBoard(board);
            this.isShuffling = false;
        } else {
            // Se falhou, tenta novamente mantendo o estado de embaralhamento
            setTimeout(() => this.actuallyShuffle(), 500);
        }
    }
    
    showStatsModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal stats-modal';
        const achievementsList = Array.from(this.achievements || []);
        const levels = this.stats && this.stats.levels ? this.stats.levels : {};
        const rows = Object.keys(levels).sort((a,b)=>Number(a)-Number(b)).map(l => {
            const st = levels[l];
            const time = st ? Math.round((st.timeMs || 0)/1000) : 0;
            const hints = st ? st.hintsUsed || 0 : 0;
            const words = st ? st.wordsFound || 0 : 0;
            return `<tr><td>${l}</td><td>${time}s</td><td>${hints}</td><td>${words}</td></tr>`;
        }).join('');
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>📈 Estatísticas</h2>
                </div>
                <div class="level-modal-body">
                    <div class="level-stats">
                        <div class="stat"><span class="stat-label">Conquistas:</span><span class="stat-value">${achievementsList.join(', ') || '—'}</span></div>
                    </div>
                    <table style="width:100%; color:#ff69b4;">
                        <thead><tr><th>Nível</th><th>Tempo</th><th>Dicas</th><th>Palavras</th></tr></thead>
                        <tbody>${rows || ''}</tbody>
                    </table>
                </div>
                <button class="next-level-button">Fechar</button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(()=>modal.classList.add('show'),100);
        modal.querySelector('.next-level-button').addEventListener('click', ()=> modal.remove());
    }
    
    showAchievementsModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal achievements-modal';
        const achievementsList = Array.from(this.achievements || []);
        const items = achievementsList.map(a => `<li>${a}</li>`).join('');
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>🏆 Conquistas</h2>
                </div>
                <div class="level-modal-body">
                    <ul style="list-style:none; padding:0; color:#ff69b4;">${items || '<li>—</li>'}</ul>
                </div>
                <button class="next-level-button">Fechar</button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(()=>modal.classList.add('show'),100);
        modal.querySelector('.next-level-button').addEventListener('click', ()=> modal.remove());
    }

    showLevelCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>🎉 Parabéns! 🎉</h2>
                    <div class="stars">⭐⭐⭐</div>
                </div>
                <div class="level-modal-body">
                    <p>Você completou o Nível ${this.currentLevel}!</p>
                    <div class="level-stats">
                        <div class="stat">
                            <span class="stat-label">Pontuação:</span>
                            <span class="stat-value">${this.score}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Palavras Encontradas:</span>
                            <span class="stat-value">${this.wordsPerLevel}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Tempo:</span>
                            <span class="stat-value">${Math.round(((Date.now() - (this.levelStartTime || Date.now()))/1000))}s</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Dicas usadas:</span>
                            <span class="stat-value">${this.hintsUsedThisLevel || 0}</span>
                        </div>
                    </div>
                    <div class="completion-message"></div>
                </div>
                <button class="next-level-button">Próximo Nível 🚀</button>
            </div>
        `;

        document.body.appendChild(modal);
        
        this.sounds.levelUp.play();

        modal.querySelector('.next-level-button').addEventListener('click', () => {
            // Registrar estatísticas e conquistas do nível
            const elapsedMs = Date.now() - (this.levelStartTime || Date.now());
            this.stats.levels[this.currentLevel] = {
                timeMs: elapsedMs,
                hintsUsed: this.hintsUsedThisLevel || 0,
                wordsFound: this.wordsPerLevel
            };
            if ((this.hintsUsedThisLevel || 0) === 0) {
                this.achievements.add('Sem Dica');
            }
            if (elapsedMs <= 60000) {
                this.achievements.add('Velocista');
            }
            // Reset contadores para próximo nível
            this.levelStartTime = Date.now();
            this.hintsUsedThisLevel = 0;
            this.wordsFoundThisLevel = 0;
            
            modal.remove();
            
            // Incrementa o nível antes de iniciar o próximo
            this.currentLevel++;
            this.levels = this.createLevels();
            this.wordsPerLevel = this.levels[this.currentLevel].length;
            this.wordsFound = 0;
            
            // Remove todas as listas de palavras antigas
            document.querySelectorAll('.word-list, .word-list-container').forEach(el => el.remove());
            
            // Remove o botão toggle se existir
            const toggleButton = document.querySelector('.word-list-toggle');
            if (toggleButton) {
                toggleButton.remove();
            }
            
            // Cria nova lista de palavras
            this.createWordList();
            this.updateLevelInfo();
            this.createBoard();
            // Verifica imediatamente se há opções válidas e embaralha se necessário
            this.checkAvailableWords();
        });

        setTimeout(() => modal.classList.add('show'), 100);
    }

    showGameCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal final-proposal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>Quer se Casar namorar? 💍</h2>
                    <div class="stars">💝💝💝</div>
                </div>
                <div class="level-modal-body">
                    <p>Você completou todos os níveis!</p>
                    <div class="level-stats">
                        <div class="stat">
                            <span class="stat-label">Pontuação Final:</span>
                            <span class="stat-value">${this.score}</span>
                        </div>
                    </div>
                    <p class="proposal-message">
                        Você é a peça que faltava no meu quebra-cabeça! 💑<br>
                        Você quer se namorar comigo? 💕
                    </p>
                    <div class="proposal-animation">
                        💑💍💒
                    </div>
                </div>
                <div class="proposal-buttons">
                    <button class="yes-button">Sim! 💝</button>
                    <button class="maybe-button">Talvez... 🤔</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        this.sounds.levelUp.play();

        modal.querySelector('.yes-button').addEventListener('click', () => {
            this.showFinalYesMessage();
        });

        modal.querySelector('.maybe-button').addEventListener('click', () => {
            this.showTryAgainMessage();
        });
        

        setTimeout(() => {
            modal.classList.add('show');
            this.renderEmojis(modal);
        }, 100);
    }

    showFinalYesMessage() {
        const prev = document.querySelector('.final-proposal');
        if (prev) prev.remove();
        const messageModal = document.createElement('div');
        messageModal.className = 'level-modal message-modal';
        messageModal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>💝 Perfeito!</h2>
                </div>
                <div class="level-modal-body">
                    <p>Eu te amo! 💑</p>
                </div>
                <button class="next-level-button">OK 👍</button>
            </div>
        `;
        document.body.appendChild(messageModal);
        setTimeout(() => {
            messageModal.classList.add('show');
            this.renderEmojis(messageModal);
        }, 100);
        messageModal.querySelector('.next-level-button').addEventListener('click', () => {
            messageModal.remove();
            this.goToHome();
        });
    }

    showTryAgainMessage() {
        const prev = document.querySelector('.final-proposal');
        if (prev) prev.remove();
        const messageModal = document.createElement('div');
        messageModal.className = 'level-modal message-modal';
        messageModal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>😊 Sem pressa!</h2>
                </div>
                <div class="level-modal-body">
                    <p>Leve seu tempo! 💕</p>
                </div>
                <button class="next-level-button">OK 👍</button>
            </div>
        `;
        document.body.appendChild(messageModal);
        setTimeout(() => {
            messageModal.classList.add('show');
            this.renderEmojis(messageModal);
        }, 100);
        messageModal.querySelector('.next-level-button').addEventListener('click', () => {
            messageModal.remove();
            this.goToHome();
        });
    }

    showEasterEggModal(word) {
        const modal = document.createElement('div');
        modal.className = 'level-modal easter-egg-modal';
        
        // Configuração dos GIFs com caminho relativo
        const pandaGif = './images/béé.gif';
        const jacareGif = './images/jacare.png';
        
        // Conteúdo baseado na palavra encontrada com tratamento de erro
        const easterEggContent = word === 'JACARE' ? 
            `<img src="${jacareGif}" 
                 class="jacare-image" 
                 alt="Jacare"
                 onerror="console.error('Erro ao carregar Jacaré:', this.src); this.onerror=null; this.src=''; this.insertAdjacentHTML('afterend', '🐊');">` :
            `<img src="${pandaGif}" 
                 class="panda-image" 
                 alt="Panda"
                 onerror="console.error('Erro ao carregar Panda:', this.src); this.onerror=null; this.src=''; this.insertAdjacentHTML('afterend', '🐼');">`;

        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>Palavra Secreta Encontrada! 🎉</h2>
                </div>
                <div class="level-modal-body">
                    <p>${this.easterEggs[word]}</p>
                    <div class="easter-egg-animation">
                        ${easterEggContent}
                    </div>
                </div>
                <button class="next-level-button">Continuar Jogando 🎮</button>
            </div>
        `;

        document.body.appendChild(modal);
        this.sounds.easterEgg.play();

        // Validar a palavra imediatamente
        if (this.levels[this.currentLevel].includes(word)) {
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            if (wordElement && !wordElement.classList.contains('found')) {
                wordElement.classList.add('found');
                this.wordsFound++;
                this.score += word.length * 10;
                this.updateScore();
                this.updateLevelInfo();
                
                this.selectedTiles.forEach(tile => {
                    tile.classList.add('success');
                    setTimeout(() => {
                        tile.classList.remove('success');
                        tile.classList.remove('selected');
                        const newLetter = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                        tile.textContent = newLetter;
                        const row = parseInt(tile.dataset.row, 10);
                        const col = parseInt(tile.dataset.col, 10);
                        if (!isNaN(row) && !isNaN(col) && this.board && this.board[row]) {
                            this.board[row][col] = newLetter;
                        }
                    }, 500);
                });
                
                this.selectedTiles = [];
                this.updateCurrentWord();
                document.querySelectorAll('.connection-line').forEach(line => line.remove());
                
                if (this.wordsFound === this.wordsPerLevel) {
                    setTimeout(() => this.nextLevel(), 1000);
                }
            }
        }

        modal.querySelector('.next-level-button').addEventListener('click', () => {
            modal.remove();
        });

        setTimeout(() => modal.classList.add('show'), 100);
    }

    showShuffleMessage() {
        const message = document.createElement('div');
        message.className = 'shuffle-message';
        message.innerHTML = '🎲 Embaralhando...';
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 800);
    }

    // Verifica se uma palavra pode ser formada a partir de uma posição
    canWordBeFoundFromPosition(word, startRow, startCol) {
        const directions = [
            [0, 1],   // direita
            [1, 0],   // baixo
            [1, 1],   // diagonal direita-baixo
            [1, -1],  // diagonal direita-cima
            [0, -1],  // esquerda
            [-1, 0],  // cima
            [-1, -1], // diagonal esquerda-cima
            [-1, 1]   // diagonal esquerda-baixo
        ];

        for (const [dx, dy] of directions) {
            let canForm = true;
            for (let i = 0; i < word.length; i++) {
                const row = startRow + (dx * i);
                const col = startCol + (dy * i);
                
                if (row < 0 || row >= this.boardSize || col < 0 || col >= this.boardSize) {
                    canForm = false;
                    break;
                }
                
                if (this.board[row][col] !== word[i]) {
                    canForm = false;
                    break;
                }
            }
            if (canForm) return true;
        }
        return false;
    }

    // Verifica se ainda existem palavras disponíveis no tabuleiro
    checkAvailableWords() {
        const levelWords = this.levels[this.currentLevel] || [];

        // Palavras que ainda não foram marcadas como encontradas
        const remainingWords = levelWords.filter(word => {
            if (!word || typeof word !== 'string' || word.trim() === '') return false;
            const el = document.querySelector(`[data-word="${word}"]`);
            return !el || !el.classList.contains('found');
        });

        if (remainingWords.length === 0) {
            return true; // nada para procurar, nível já completo
        }

        // Procura de forma completa: cada palavra em cada posição
        for (const word of remainingWords) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.canWordBeFoundFromPosition(word, row, col)) {
                        return true; // pelo menos uma palavra ainda é possível
                    }
                }
            }
        }

        // Se chegou aqui, provavelmente travou (nenhuma palavra restante pode ser formada)
        // Deixa o embaralhamento real ser acionado por shuffleBoard, usando o guard de isShuffling
        this.shuffleBoard();
        return false;
    }

    // Verificador de disponibilidade de palavras
    setupWordAvailabilityChecker() {
        // Limpa qualquer intervalo existente
        if (this.wordCheckInterval) {
            clearInterval(this.wordCheckInterval);
        }

        // Verifica a disponibilidade de palavras a cada 5 segundos
        this.wordCheckInterval = setInterval(() => {
            const gameBoard = document.querySelector('.game-board');
            if (!gameBoard || gameBoard.children.length === 0) return;
            if (this.isShuffling) return;

            // Delega a decisão de embaralhar para checkAvailableWords
            this.checkAvailableWords();
        }, 5000);
    }

    setupClearButton() {
        const gameHeader = document.querySelector('.game-header');

        // Evita duplicar botão de limpar
        if (document.getElementById('clear-button')) return;

        const clearButton = document.createElement('button');
        clearButton.id = 'clear-button';
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '🧹 Limpar';
        
        clearButton.addEventListener('click', () => {
            // Limpa todas as seleções
            this.selectedTiles.forEach(tile => tile.classList.remove('selected'));
            this.selectedTiles = [];
            this.updateCurrentWord();
            document.querySelectorAll('.connection-line').forEach(line => line.remove());
        });
        
        gameHeader.appendChild(clearButton);
    }

    setupGameControls() {
        const gameHeader = document.querySelector('.game-header');

        // Evita recriar se já existem controles
        if (document.getElementById('home-button')) return;
        
        // Botão Home
        const homeButton = document.createElement('button');
        homeButton.id = 'home-button';
        homeButton.className = 'control-button home-button';
        homeButton.innerHTML = '🏠 Início';
        
        homeButton.addEventListener('click', () => {
            this.showConfirmModal(
                '🏠 Voltar para o Início',
                'Você deseja salvar o progresso antes de voltar para a tela inicial?',
                () => {
                    // Se confirmar, salva e volta
                    this.saveGame();
                    this.goToHome();
                },
                () => {
                    // Se cancelar, mostra segunda confirmação
                    this.showConfirmModal(
                        '⚠️ Progresso Não Salvo',
                        'Você tem certeza que deseja sair sem salvar? Todo o progresso não salvo será perdido!',
                        () => {
                            // Se confirmar que quer sair sem salvar
                            this.goToHome();
                        }
                    );
                }
            );
        });

        // Botão de Save
        const saveButton = document.createElement('button');
        saveButton.id = 'save-button';
        saveButton.className = 'control-button save-button';
        saveButton.innerHTML = '💾 Salvar';
        
        saveButton.addEventListener('click', () => {
            this.saveGame();
        });
        
        // Botão de Reset
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-button';
        resetButton.className = 'control-button reset-button';
        resetButton.innerHTML = '🔄 Reiniciar';
        
        resetButton.addEventListener('click', () => {
            this.showConfirmModal(
                '🔄 Reiniciar Nível',
                'Você tem certeza que deseja reiniciar este nível? Todo o progresso neste nível será perdido!',
                () => {
                    this.resetLevel();
                }
            );
        });
        
        // Adiciona os botões na ordem
        gameHeader.appendChild(homeButton);
        gameHeader.appendChild(saveButton);
        gameHeader.appendChild(resetButton);
        
        // Botão de Estatísticas
        const statsButton = document.createElement('button');
        statsButton.id = 'stats-button';
        statsButton.className = 'control-button stats-button';
        statsButton.innerHTML = '📈 Estatísticas';
        statsButton.addEventListener('click', () => {
            this.showStatsModal();
        });
        gameHeader.appendChild(statsButton);
        
        const achButton = document.createElement('button');
        achButton.id = 'achievements-button';
        achButton.className = 'control-button achievements-button';
        achButton.innerHTML = '🏆 Conquistas';
        achButton.addEventListener('click', () => {
            this.showAchievementsModal();
        });
        gameHeader.appendChild(achButton);
    }

    saveGame() {
        const gameState = {
            level: this.currentLevel,
            score: this.score,
            hintsRemaining: this.hintsRemaining,
            foundWords: Array.from(document.querySelectorAll('.word-list li.found')).map(el => el.dataset.word),
            achievements: Array.from(this.achievements || []),
            stats: this.stats || { levels: {} }
        };
        
        localStorage.setItem('wordGameSave', JSON.stringify(gameState));
        
        // Salva também no IndexedDB para maior robustez
        this.saveStateToDB(gameState).catch(() => {});
        this.showMessageModal('✅ Jogo Salvo', 'Seu progresso foi salvo com sucesso!');
    }

    resetLevel() {
        this.wordsFound = 0;
        this.updateLevelInfo();
        document.querySelectorAll('.word-list li').forEach(item => {
            item.classList.remove('found');
        });
        this.createBoard();
        this.showMessageModal('✅ Sucesso', 'Nível reiniciado com sucesso!');
    }

    loadGame() {
        const proceedWithState = (gameState) => {
            // Inicializar primeiro as variáveis básicas do jogo
            this.board = [];
            this.selectedTiles = [];
            this.boardSize = 6;
            this.letters = 'AEIOUÁÉÍÓÚÃÕÇBCDFGHJKLMNPQRSTVWXYZ';
            this.levels = this.createLevels();

            this.currentLevel = gameState.level;
            this.score = gameState.score;
            this.hintsRemaining = gameState.hintsRemaining;
            this.wordsFound = gameState.foundWords.length;
            this.wordsPerLevel = this.levels[this.currentLevel].length;
            this.achievements = new Set((gameState.achievements || []));
            this.stats = gameState.stats || { levels: {} };
            this.levelStartTime = Date.now();
            this.hintsUsedThisLevel = 0;
            this.wordsFoundThisLevel = this.wordsFound;
            
            // Inicializar a interface do jogo
            this.init();
            this.setupSoundControls();
            
            // Marcar palavras encontradas
            gameState.foundWords.forEach(word => {
                const wordElement = document.querySelector(`[data-word="${word}"]`);
                if (wordElement) {
                    wordElement.classList.add('found');
                }
            });
        };
        
        // Primeiro tenta IndexedDB
        this.initDatabase().then(() => {
            this.loadStateFromDB().then(state => {
                if (state) {
                    proceedWithState(state);
                    return;
                }
                const savedGame = localStorage.getItem('wordGameSave');
                if (savedGame) {
                    proceedWithState(JSON.parse(savedGame));
                }
            }).catch(() => {
                const savedGame = localStorage.getItem('wordGameSave');
                if (savedGame) {
                    proceedWithState(JSON.parse(savedGame));
                }
            });
        }).catch(() => {
            const savedGame = localStorage.getItem('wordGameSave');
            if (savedGame) {
                proceedWithState(JSON.parse(savedGame));
            }
        });
    }

    showConfirmModal(title, message, onConfirm, onCancel = null) {
        const modal = document.createElement('div');
        modal.className = 'level-modal confirm-modal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>${title}</h2>
                </div>
                <div class="level-modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-buttons">
                    <button class="confirm-button">Sim ✔️</button>
                    <button class="cancel-button">Não ❌</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => {
            modal.classList.add('show');
            this.renderEmojis(modal);
        }, 100);

        modal.querySelector('.confirm-button').addEventListener('click', () => {
            onConfirm();
            modal.remove();
        });

        modal.querySelector('.cancel-button').addEventListener('click', () => {
            if (onCancel) onCancel();
            modal.remove();
        });
    }

    showMessageModal(title, message) {
        const modal = document.createElement('div');
        modal.className = 'level-modal message-modal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>${title}</h2>
                </div>
                <div class="level-modal-body">
                    <p>${message}</p>
                </div>
                <button class="next-level-button">OK 👍</button>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => {
            modal.classList.add('show');
            this.renderEmojis(modal);
        }, 100);

        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Função para voltar à tela inicial
    goToHome() {
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
        if (this.wordCheckInterval) {
            clearInterval(this.wordCheckInterval);
        }
        this.isShuffling = false;
        
        // Atualiza visibilidade do botão "Continuar Jogo" conforme existência de save
        const continueButton = document.getElementById('continue-game');
        const savedGame = localStorage.getItem('wordGameSave');
        if (continueButton) {
            continueButton.style.display = savedGame ? 'block' : 'none';
            if (savedGame) {
                continueButton.onclick = () => {
                    document.getElementById('start-screen').style.display = 'none';
                    document.getElementById('game-container').style.display = 'block';
                    this.loadGame();
                };
            } else {
                continueButton.onclick = null;
            }
        }
        
    }
    
    setupThemeControls() {
        if (document.getElementById('theme-button')) return;
        if (document.querySelector('.hamburger-button')) return;
        const btn = document.createElement('button');
        btn.id = 'theme-button';
        btn.className = 'theme-button';
        const savedTheme = localStorage.getItem('wordGameTheme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        btn.textContent = document.body.classList.contains('dark-mode') ? '☀️' : '🌙';
        btn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('wordGameTheme', isDark ? 'dark' : 'light');
            btn.textContent = isDark ? '☀️' : '🌙';
        });
        document.body.appendChild(btn);
    }
    
    autoLoadIfAvailable() {
        this.initDatabase().then(() => {
            this.loadStateFromDB().then(state => {
                if (state) {
                    document.getElementById('start-screen').style.display = 'none';
                    document.getElementById('game-container').style.display = 'block';
                    this.board = [];
                    this.selectedTiles = [];
                    this.boardSize = 6;
                    this.letters = 'AEIOUÁÉÍÓÚÃÕÇBCDFGHJKLMNPQRSTVWXYZ';
                    this.levels = this.createLevels();
                    this.currentLevel = state.level;
                    this.score = state.score;
                    this.hintsRemaining = state.hintsRemaining;
                    this.wordsFound = state.foundWords.length;
                    this.wordsPerLevel = this.levels[this.currentLevel].length;
                    this.init();
                    this.setupHamburgerMenu();
                    state.foundWords.forEach(word => {
                        const wordElement = document.querySelector(`[data-word="${word}"]`);
                        if (wordElement) {
                            wordElement.classList.add('found');
                        }
                    });
                    return;
                }
                const savedGame = localStorage.getItem('wordGameSave');
                if (savedGame) {
                    document.getElementById('start-screen').style.display = 'none';
                    document.getElementById('game-container').style.display = 'block';
                    const gameState = JSON.parse(savedGame);
                    this.board = [];
                    this.selectedTiles = [];
                    this.boardSize = 6;
                    this.letters = 'AEIOUÁÉÍÓÚÃÕÇBCDFGHJKLMNPQRSTVWXYZ';
                    this.levels = this.createLevels();
                    this.currentLevel = gameState.level;
                    this.score = gameState.score;
                    this.hintsRemaining = gameState.hintsRemaining;
                    this.wordsFound = gameState.foundWords.length;
                    this.wordsPerLevel = this.levels[this.currentLevel].length;
                    this.init();
                    this.setupHamburgerMenu();
                    gameState.foundWords.forEach(word => {
                        const wordElement = document.querySelector(`[data-word="${word}"]`);
                        if (wordElement) {
                            wordElement.classList.add('found');
                        }
                    });
                }
            }).catch(() => {});
        }).catch(() => {});
    }
    
    // Persistência com IndexedDB
    initDatabase() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                resolve();
                return;
            }
            const request = indexedDB.open('WordGameDB', 1);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('gameState')) {
                    db.createObjectStore('gameState', { keyPath: 'id' });
                }
            };
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
    
    saveStateToDB(state) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            const tx = this.db.transaction('gameState', 'readwrite');
            const store = tx.objectStore('gameState');
            store.put({ ...state, id: 'default', updatedAt: Date.now() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    
    loadStateFromDB() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }
            const tx = this.db.transaction('gameState', 'readonly');
            const store = tx.objectStore('gameState');
            const req = store.get('default');
            req.onsuccess = () => {
                resolve(req.result || null);
            };
            req.onerror = () => reject(req.error);
        });
    }
}

// Iniciar o jogo quando a página carregar
window.addEventListener('load', () => {
    new WordGame();
});


