class WordGame {
    constructor() {
        // Iniciar música de fundo imediatamente
        this.setupSounds();
        this.sounds.background.play().catch(error => {
            console.log('Erro ao tocar música:', error);
        });
        
        // Verifica se existe jogo salvo antes de configurar a tela inicial
        const savedGame = localStorage.getItem('wordGameSave');
        const continueButton = document.getElementById('continue-game');
        
        if (savedGame) {
            continueButton.style.display = 'block';
        } else {
            continueButton.style.display = 'none';
        }
        
        this.setupStartScreen();
        this.setupTutorial();
    }

    setupTutorial() {
        const howToPlayButton = document.getElementById('how-to-play');
        if (howToPlayButton) {
            howToPlayButton.addEventListener('click', () => {
                const modal = document.createElement('div');
                modal.className = 'level-modal tutorial-modal';
                modal.innerHTML = `
                    <div class="level-modal-content">
                        <div class="level-modal-header">
                            <h2>How to Play 📝</h2>
                        </div>
                        <div class="level-modal-body">
                            <div class="tutorial-step">
                                <p>1. Find words in the letter grid 🔍</p>
                                <p>2. Click and drag to select letters ✨</p>
                                <p>3. Words can be in any direction 🔄</p>
                                <p>4. Use hints if you need help 💡</p>
                                <p>5. Find all words to level up 🎮</p>
                                <p>6. Look for hidden special surprises! 🎁</p>
                            </div>
                        </div>
                        <button class="next-level-button">Got it! 👍</button>
                    </div>
                `;

                document.body.appendChild(modal);
                
                modal.querySelector('button').addEventListener('click', () => {
                    modal.remove();
                });

                setTimeout(() => modal.classList.add('show'), 100);
            });
        }
    }

    setupStartScreen() {
        const startButton = document.getElementById('start-game');
        const continueButton = document.getElementById('continue-game');
        const resetAllButton = document.createElement('button');
        
        // Adiciona botão de Reset All
        resetAllButton.id = 'reset-all-button';
        resetAllButton.className = 'reset-all-button';
        resetAllButton.innerHTML = '🗑️ Reset All Progress';
        
        startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        resetAllButton.addEventListener('click', () => {
            this.showConfirmModal(
                '🚨 Reset All Progress',
                'Are you sure you want to reset ALL progress? This cannot be undone!',
                () => {
                    localStorage.removeItem('wordGameSave');
                    continueButton.style.display = 'none';
                    resetAllButton.remove();
                    this.showMessageModal('✅ Success', 'All progress has been reset!');
                }
            );
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
            
            // Adiciona o botão de reset apenas se houver save
            document.querySelector('.start-buttons').appendChild(resetAllButton);
        } else {
            continueButton.style.display = 'none';
        }

        // Adiciona o atalho secreto no emoji de coração
        const title = document.querySelector('h1');
        const heartEmoji = title.innerHTML.split('🌸')[1].trim();
        title.innerHTML = `🌸 Cute Word Game <span class="secret-heart">💝</span> 🌸`;

        document.querySelector('.secret-heart').addEventListener('click', () => {
            document.getElementById('start-screen').style.display = 'none';
            document.getElementById('game-container').style.display = 'block';
            
            // Inicializa o jogo no último nível
            this.board = [];
            this.selectedTiles = [];
            this.score = 0;
            this.boardSize = 6;
            this.letters = 'AEIOUÁÉÍÓÚBCDFGHJKLMNPQRSTVWXYZ';
            this.currentLevel = 15; // Último nível
            this.wordsPerLevel = 5;
            this.wordsFound = 0;
            this.levels = this.createLevels();
            this.hintsRemaining = 50;
            
            this.init();
            this.setupSoundControls();
        });
    }

    startGame() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-container').style.display = 'block';
        
        // Inicializar o jogo
        this.board = [];
        this.selectedTiles = [];
        this.score = 0;
        this.boardSize = 6;
        this.letters = 'AEIOUÁÉÍÓÚBCDFGHJKLMNPQRSTVWXYZ';
        this.currentLevel = 1;
        this.wordsPerLevel = 5;
        this.wordsFound = 0;
        this.levels = this.createLevels();
        this.hintsRemaining = 50;
        
        this.init();
        this.setupSoundControls();
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

        // Configurar música de fundo
        this.sounds.background.loop = true;
        
        // Iniciar música automaticamente
        const startBackgroundMusic = () => {
            this.sounds.background.play().catch(error => {
                console.log('Erro ao tocar música:', error);
            });
        };

        // Tentar iniciar a música quando houver qualquer interação
        document.addEventListener('click', startBackgroundMusic, { once: true });
        document.addEventListener('touchstart', startBackgroundMusic, { once: true });
    }

    setupSoundControls() {
        const soundButton = document.createElement('button');
        soundButton.className = 'sound-button';
        soundButton.innerHTML = '🔊'; // Começa mostrando que tem som
        
        let isPlaying = true; // Começa tocando

        const toggleMusic = () => {
            try {
                if (!isPlaying) {
                    this.sounds.background.play();
                    soundButton.innerHTML = '🔊';
                    soundButton.classList.add('playing');
                    isPlaying = true;
                } else {
                    this.sounds.background.pause();
                    soundButton.innerHTML = '🔈';
                    soundButton.classList.remove('playing');
                    isPlaying = false;
                }
            } catch (error) {
                console.log('Erro ao controlar música:', error);
            }
        };

        soundButton.addEventListener('click', toggleMusic);
        document.querySelector('.game-header').appendChild(soundButton);
    }

    createLevels() {
        // Easter Eggs separados
        this.easterEggs = {
            'GRINCH': '🎄 You found the Grinch, I dont like it',
            'PANDA': '🐼 Im ur Panda 🎋'
        };

        return {
            1: ['LOVE', 'JEAN', 'RAPH', 'STAR', 'HOPE'],
            2: ['HAPPY', 'SWEET', 'PEACE', 'FAIRY', 'ANGEL'],
            3: ['DREAM', 'CAKE', 'HOME', 'PANDA', 'MOON'],
            4: ['PARTY', 'DANCE', 'JOY', 'GRINCH', 'STAR'],
            5: ['MAGIC', 'HEART', 'CUTE', 'ROSE', 'LIGHT'],
            6: ['SMILE', 'CANDY', 'WISH', 'STAR', 'LOVE'],
            7: ['SHINE', 'SONG', 'FAIRY', 'PURE', 'WING'],
            8: ['CLOUD', 'STAR', 'FISH', 'BIRD', 'SUN'],
            9: ['BLOOM', 'BOOK', 'SOFT', 'KISS', 'SONG'],
            10: ['PEARL', 'RAIN', 'LEAF', 'DUCK', 'VEIL'],
            11: ['RING', 'WIND', 'CORD', 'HAND', 'GOLD'],
            12: ['MOON', 'GIFT', 'DICE', 'WISH', 'SNOW'],
            13: ['SHIP', 'SAFE', 'SAND', 'SEAL', 'DROP'],
            14: ['SEAT', 'SONG', 'SPIN', 'SEAL', 'TURN'],
            15: ['MARRY', 'ME', 'NOW', 'DEAR', 'LOVE']
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
    }

    createBoard() {
        const gameBoard = document.querySelector('.game-board');
        gameBoard.innerHTML = '';
        
        const createNewBoard = () => {
            const board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
            const words = this.levels[this.currentLevel];
            const remainingWords = words.filter(word => {
                const wordElement = document.querySelector(`[data-word="${word}"]`);
                return !wordElement || !wordElement.classList.contains('found');
            });

            // Tenta colocar primeiro as palavras que faltam
            for (const word of remainingWords) {
                if (!this.placeWordOnBoard(word, board)) {
                    return null; // Se falhar em colocar alguma palavra, tenta novamente
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
            return board;
        };

        let attempts = 0;
        const maxAttempts = 5;
        let board = null;

        while (attempts < maxAttempts && !board) {
            board = createNewBoard();
            if (!board) {
                attempts++;
                if (attempts < maxAttempts) {
                    this.showShuffleMessage();
                }
            }
        }

        if (!board) {
            console.log("Usando tabuleiro de emergência");
            board = this.createEmergencyBoard();
        }

        this.renderBoard(board);
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
            [-1, 1],  // diagonal direita-cima
            [0, -1],  // esquerda
            [-1, 0],  // cima
            [-1, -1], // diagonal esquerda-cima
            [1, -1]   // diagonal esquerda-baixo
        ];

        // Aumenta o número de tentativas para garantir que a palavra seja colocada
        for (let attempts = 0; attempts < 200; attempts++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * this.boardSize);
            const startCol = Math.floor(Math.random() * this.boardSize);

            if (this.canPlaceWord(word, startRow, startCol, direction, board)) {
                this.placeWord(word, startRow, startCol, direction, board);
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

    placeWord(word, startRow, startCol, [dx, dy], board) {
        for (let i = 0; i < word.length; i++) {
            const row = startRow + (dx * i);
            const col = startCol + (dy * i);
            board[row][col] = word[i];
        }
    }

    setupEventListeners() {
        document.querySelector('.game-board').addEventListener('click', (e) => {
            if (e.target.classList.contains('letter-tile')) {
                this.handleTileClick(e.target);
            }
        });
    }

    createWordList() {
        const container = document.querySelector('.container');
        const wordListContainer = document.createElement('div');
        wordListContainer.className = 'word-list-container';
        
        // Criar botão toggle para mobile
        const toggleButton = document.createElement('button');
        toggleButton.className = 'word-list-toggle';
        toggleButton.innerHTML = '📝 View Words';
        
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
            toggleButton.innerHTML = wordList.classList.contains('show') ? '❌ Close' : '📝 View Words';
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
                    [-1, 1],  // diagonal direita-cima
                    [0, -1],  // esquerda
                    [-1, 0],  // cima
                    [-1, -1], // diagonal esquerda-cima
                    [1, -1]   // diagonal esquerda-baixo
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
        levelInfo.innerHTML = `Level ${this.currentLevel} - Words found: ${this.wordsFound}/${this.wordsPerLevel}`;
        
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
            // Modal especial de proposta
            const modal = document.createElement('div');
            modal.className = 'level-modal proposal-modal';
            modal.innerHTML = `
                <div class="level-modal-content">
                    <div class="level-modal-header">
                        <h2>💝 Special Moment 💝</h2>
                    </div>
                    <div class="level-modal-body">
                        <div class="proposal-animation">💍</div>
                        <p class="proposal-message">Marry Me?</p>
                    </div>
                    <div class="proposal-buttons">
                        <button class="yes-button">Yes! 💖</button>
                        <button class="maybe-button">Maybe... 🤔</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            setTimeout(() => modal.classList.add('show'), 100);

            const showCredits = () => {
                const creditsModal = document.createElement('div');
                creditsModal.className = 'level-modal credits-modal';
                creditsModal.innerHTML = `
                    <div class="level-modal-content">
                        <div class="level-modal-body">
                            <div class="credits-scroll">
                                <h2>To Jean, the love of my life 💖</h2>
                                <p>From the first "hi" to every conversation that brightens my days, you have been my brightest star. This game is just a small way to show how much you mean to me. Every word here was written with love, but none of them can truly describe how much I love you.</p>
                                <p>Even with oceans between us, my heart always finds its way back to you. One day, there will be no screens between us—just us, side by side, writing our own story.</p>
                                <p class="signature">With all my love,<br>Raphael 💙✨</p>
                            </div>
                            <button class="home-credits-button" style="opacity: 0">🏠</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(creditsModal);
                setTimeout(() => creditsModal.classList.add('show'), 100);

                // Mostrar o botão home após a animação dos créditos
                setTimeout(() => {
                    const homeButton = creditsModal.querySelector('.home-credits-button');
                    homeButton.style.opacity = '1';
                    homeButton.addEventListener('click', () => {
                        creditsModal.remove();
                        this.goToHome();
                    });
                }, 12000); // Aparece após 12 segundos (quando a animação está quase no fim)
            };

            modal.querySelector('.yes-button').addEventListener('click', () => {
                const messageModal = document.createElement('div');
                messageModal.className = 'level-modal message-modal';
                messageModal.innerHTML = `
                    <div class="level-modal-content">
                        <div class="level-modal-header">
                            <h2>💝 Perfect!</h2>
                        </div>
                        <div class="level-modal-body">
                            <p>I love you! 💑</p>
                        </div>
                        <button class="next-level-button">OK 👍</button>
                    </div>
                `;

                modal.remove();
                document.body.appendChild(messageModal);
                setTimeout(() => messageModal.classList.add('show'), 100);

                messageModal.querySelector('button').addEventListener('click', () => {
                    messageModal.remove();
                    showCredits();
                });
            });

            modal.querySelector('.maybe-button').addEventListener('click', () => {
                const messageModal = document.createElement('div');
                messageModal.className = 'level-modal message-modal';
                messageModal.innerHTML = `
                    <div class="level-modal-content">
                        <div class="level-modal-header">
                            <h2>😊 No pressure!</h2>
                        </div>
                        <div class="level-modal-body">
                            <p>Take your time! 💕</p>
                        </div>
                        <button class="next-level-button">OK 👍</button>
                    </div>
                `;

                modal.remove();
                document.body.appendChild(messageModal);
                setTimeout(() => messageModal.classList.add('show'), 100);

                messageModal.querySelector('button').addEventListener('click', () => {
                    messageModal.remove();
                    showCredits();
                });
            });
        } else {
            this.showLevelCompleteModal();
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
    }

    setupHintButton() {
        const hintButton = document.createElement('button');
        hintButton.id = 'hint-button';
        hintButton.className = 'hint-button';
        hintButton.innerHTML = `💡 Hint (${this.hintsRemaining})`;
        
        hintButton.addEventListener('click', () => {
            this.useHint();
        });
        
        document.querySelector('.game-header').appendChild(hintButton);
    }

    useHint() {
        if (this.hintsRemaining <= 0) {
            alert('No more hints available! 🌸');
            return;
        }

        // Pega todas as palavras que ainda não foram encontradas
        const words = this.levels[this.currentLevel];
        const remainingWords = words.filter(word => {
            const wordElement = document.querySelector(`[data-word="${word}"]`);
            return !wordElement.classList.contains('found');
        });

        if (remainingWords.length === 0) {
            alert('You found all words in this level! 🎉');
            return;
        }

        // Escolhe uma palavra aleatória das restantes
        const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
        
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
                    [-1, 1],  // diagonal direita-cima
                    [0, -1],  // esquerda
                    [-1, 0],  // cima
                    [-1, -1], // diagonal esquerda-cima
                    [1, -1]   // diagonal esquerda-baixo
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
        document.getElementById('hint-button').innerHTML = `💡 Hint (${this.hintsRemaining})`;
    }

    shuffleBoard() {
        this.showShuffleMessage();
        
        setTimeout(() => {
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
            } else {
                // Se falhou, tenta novamente
                setTimeout(() => this.shuffleBoard(), 500);
            }
        }, 1000);
    }

    showLevelCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>🎉 Congratulations! 🎉</h2>
                    <div class="stars">⭐⭐⭐</div>
                </div>
                <div class="level-modal-body">
                    <p>You completed Level ${this.currentLevel}!</p>
                    <div class="level-stats">
                        <div class="stat">
                            <span class="stat-label">Score:</span>
                            <span class="stat-value">${this.score}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Words Found:</span>
                            <span class="stat-value">${this.wordsPerLevel}</span>
                        </div>
                    </div>
                </div>
                <button class="next-level-button">Next Level 🚀</button>
            </div>
        `;

        document.body.appendChild(modal);
        
        this.sounds.levelUp.play();

        modal.querySelector('.next-level-button').addEventListener('click', () => {
            modal.remove();
            
            // Incrementa o nível antes de iniciar o próximo
            this.currentLevel++;
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
        });

        setTimeout(() => modal.classList.add('show'), 100);
    }

    showGameCompleteModal() {
        const modal = document.createElement('div');
        modal.className = 'level-modal final-proposal';
        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>Will You Marry Me? 💍</h2>
                    <div class="stars">💝💝💝</div>
                </div>
                <div class="level-modal-body">
                    <p>You completed all levels!</p>
                    <div class="level-stats">
                        <div class="stat">
                            <span class="stat-label">Final Score:</span>
                            <span class="stat-value">${this.score}</span>
                        </div>
                    </div>
                    <p class="proposal-message">
                        You're the missing piece to my puzzle! 💑<br>
                        Will you make me the happiest person alive? 💕
                    </p>
                    <div class="proposal-animation">
                        💑💍💒
                    </div>
                </div>
                <div class="proposal-buttons">
                    <button class="yes-button">Yes! 💝</button>
                    <button class="maybe-button">Maybe... 🤔</button>
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

        setTimeout(() => modal.classList.add('show'), 100);
    }

    showEasterEggModal(word) {
        const modal = document.createElement('div');
        modal.className = 'level-modal easter-egg-modal';
        
        // Configuração dos GIFs com caminho relativo
        const pandaGif = './images/panda.gif';
        const grinchGif = './images/grinch.gif';
        
        // Conteúdo baseado na palavra encontrada com tratamento de erro
        const easterEggContent = word === 'GRINCH' ? 
            `<img src="${grinchGif}" 
                 class="grinch-image" 
                 alt="Grinch"
                 onerror="console.error('Erro ao carregar Grinch:', this.src); this.onerror=null; this.src=''; this.insertAdjacentHTML('afterend', '🎄');">` :
            `<img src="${pandaGif}" 
                 class="panda-image" 
                 alt="Panda"
                 onerror="console.error('Erro ao carregar Panda:', this.src); this.onerror=null; this.src=''; this.insertAdjacentHTML('afterend', '🐼');">`;

        modal.innerHTML = `
            <div class="level-modal-content">
                <div class="level-modal-header">
                    <h2>Secret Word Found! 🎉</h2>
                </div>
                <div class="level-modal-body">
                    <p>${this.easterEggs[word]}</p>
                    <div class="easter-egg-animation">
                        ${easterEggContent}
                    </div>
                </div>
                <button class="next-level-button">Continue Playing 🎮</button>
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
                
                // Limpar seleções
                this.selectedTiles.forEach(tile => {
                    tile.classList.remove('selected');
                    tile.classList.add('success');
                    setTimeout(() => {
                        tile.classList.remove('success');
                        const newLetter = this.letters.charAt(
                            Math.floor(Math.random() * this.letters.length)
                        );
                        tile.textContent = newLetter;
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
        message.innerHTML = '🎲 Shuffling...';
        document.body.appendChild(message);

        setTimeout(() => {
            message.remove();
        }, 800);
    }

    checkAvailableWords() {
        const words = this.levels[this.currentLevel];
        const foundWords = Array.from(document.querySelectorAll('.word-item.found')).map(el => el.dataset.word);
        const remainingWords = words.filter(word => !foundWords.includes(word));

        // Se não houver palavras restantes, retorna true
        if (remainingWords.length === 0) return true;

        // Verifica se pelo menos uma palavra pode ser encontrada
        let anyWordCanBeFound = false;
        for (const word of remainingWords) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.canWordBeFoundFromPosition(word, row, col)) {
                        anyWordCanBeFound = true;
                        break;
                    }
                }
                if (anyWordCanBeFound) break;
            }
            if (anyWordCanBeFound) break;
        }

        // Se nenhuma palavra pode ser encontrada, faz o shuffle
        if (!anyWordCanBeFound) {
            this.showShuffleMessage();
            setTimeout(() => {
                this.createBoard();
            }, 1000);
            return false;
        }

        return true;
    }

    canWordBeFoundFromPosition(word, startRow, startCol) {
        const directions = [
            [0, 1],   // direita
            [1, 0],   // baixo
            [1, 1],   // diagonal direita-baixo
            [-1, 1],  // diagonal direita-cima
            [0, -1],  // esquerda
            [-1, 0],  // cima
            [-1, -1], // diagonal esquerda-cima
            [1, -1]   // diagonal esquerda-baixo
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

    // Adicione um verificador periódico
    setupWordAvailabilityChecker() {
        setInterval(() => {
            if (!this.checkAvailableWords()) {
                this.showShuffleMessage();
                setTimeout(() => {
                    this.createBoard();
                }, 1000);
            }
        }, 10000); // Verifica a cada 10 segundos
    }

    setupClearButton() {
        const gameHeader = document.querySelector('.game-header');
        const clearButton = document.createElement('button');
        clearButton.id = 'clear-button';
        clearButton.className = 'clear-button';
        clearButton.innerHTML = '🧹 Clear';
        
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
        
        // Botão Home
        const homeButton = document.createElement('button');
        homeButton.id = 'home-button';
        homeButton.className = 'control-button home-button';
        homeButton.innerHTML = '🏠 Home';
        
        homeButton.addEventListener('click', () => {
            this.showConfirmModal(
                '🏠 Return to Home',
                'Do you want to save your progress before returning to home screen?',
                () => {
                    // Se confirmar, salva e volta
                    this.saveGame();
                    this.goToHome();
                },
                () => {
                    // Se cancelar, mostra segunda confirmação
                    this.showConfirmModal(
                        '⚠️ Unsaved Progress',
                        'Are you sure you want to leave without saving? All unsaved progress will be lost!',
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
        saveButton.innerHTML = '💾 Save';
        
        saveButton.addEventListener('click', () => {
            this.saveGame();
        });
        
        // Botão de Reset
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-button';
        resetButton.className = 'control-button reset-button';
        resetButton.innerHTML = '🔄 Reset';
        
        resetButton.addEventListener('click', () => {
            this.showConfirmModal(
                '🔄 Reset Level',
                'Are you sure you want to reset this level? All progress in this level will be lost!',
                () => {
                    this.resetLevel();
                }
            );
        });
        
        // Adiciona os botões na ordem
        gameHeader.appendChild(homeButton);
        gameHeader.appendChild(saveButton);
        gameHeader.appendChild(resetButton);
    }

    saveGame() {
        const gameState = {
            level: this.currentLevel,
            score: this.score,
            hintsRemaining: this.hintsRemaining,
            foundWords: Array.from(document.querySelectorAll('.word-item.found')).map(el => el.dataset.word)
        };
        
        localStorage.setItem('wordGameSave', JSON.stringify(gameState));
        this.showMessageModal('💾 Game Saved', 'Your progress has been saved successfully!');
    }

    resetLevel() {
        this.wordsFound = 0;
        this.updateLevelInfo();
        document.querySelectorAll('.word-item').forEach(item => {
            item.classList.remove('found');
        });
        this.createBoard();
        this.showMessageModal('✅ Success', 'Level has been reset!');
    }

    loadGame() {
        const savedGame = localStorage.getItem('wordGameSave');
        if (savedGame) {
            // Inicializar primeiro as variáveis básicas do jogo
            this.board = [];
            this.selectedTiles = [];
            this.boardSize = 6;
            this.letters = 'AEIOUÁÉÍÓÚBCDFGHJKLMNPQRSTVWXYZ';
            this.wordsPerLevel = 5;
            this.levels = this.createLevels();

            // Carregar o estado salvo
            const gameState = JSON.parse(savedGame);
            this.currentLevel = gameState.level;
            this.score = gameState.score;
            this.hintsRemaining = gameState.hintsRemaining;
            this.wordsFound = gameState.foundWords.length;
            
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
        }
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
                    <button class="confirm-button">Yes ✔️</button>
                    <button class="cancel-button">No ❌</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);

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
        setTimeout(() => modal.classList.add('show'), 100);

        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
    }

    // Função para voltar à tela inicial
    goToHome() {
        document.getElementById('game-container').style.display = 'none';
        document.getElementById('start-screen').style.display = 'flex';
    }
}

// Iniciar o jogo quando a página carregar
window.addEventListener('load', () => {
    new WordGame();
});


