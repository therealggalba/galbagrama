import React, { useState, useEffect, useRef } from 'react';
import {
  generateNonograma,
  NonogramaGame as NonogramaGameType,
  NonogramaDifficulty
} from '@galbahub/domain';
import { Heart, Trophy, Timer, Volume2, VolumeX, RefreshCw, Gamepad2, ArrowLeft } from 'lucide-react';
import styles from './NonogramaGame.module.scss';

// Definición de niveles del Modo Montaña
const MOUNTAIN_LEVELS = [
  { size: 5, difficulty: 'easy' as const, label: '5 Fácil' },
  { size: 5, difficulty: 'medium' as const, label: '5 Medio' },
  { size: 5, difficulty: 'hard' as const, label: '5 Difícil' },
  { size: 10, difficulty: 'easy' as const, label: '10 Fácil' },
  { size: 10, difficulty: 'medium' as const, label: '10 Medio' },
  { size: 10, difficulty: 'hard' as const, label: '10 Difícil' },
  { size: 15, difficulty: 'easy' as const, label: '15 Fácil' },
  { size: 15, difficulty: 'medium' as const, label: '15 Medio' },
  { size: 15, difficulty: 'hard' as const, label: '15 Difícil' },
  { size: 20, difficulty: 'easy' as const, label: '20 Fácil' },
  { size: 20, difficulty: 'medium' as const, label: '20 Medio' },
  { size: 20, difficulty: 'hard' as const, label: '20 Difícil' },
];

type GameMode = 'menu' | 'normal' | 'mountain' | 'flash';
type CellState = 'hidden' | 'correct' | 'error';

// Diccionario de Traducciones en Español
const ES_TRANSLATIONS: Record<string, string> = {
  "common.victory": "¡Victoria!",
  "common.defeat": "¡Derrota!",
  "common.restart": "Reiniciar",
  "common.lives": "Vidas",
  "common.difficulty": "Dificultad",
  "common.size": "Tamaño",
  "common.easy": "Fácil",
  "common.medium": "Medio",
  "common.hard": "Difícil",
  "common.back": "Volver",
  "nonograma.title": "🎮 RETRO NONOGRAMA",
  "nonograma.mode": "Modo de Juego",
  "nonograma.modeNormal": "Normal",
  "nonograma.modeMountain": "Montaña",
  "nonograma.modeFlash": "Flash",
  "nonograma.livesCount": "Vidas",
  "nonograma.scoreRecord": "Récord: {{score}}",
  "nonograma.round": "Ronda {{round}}",
  "nonograma.consecutiveRecord": "Récord Montaña: Ronda {{round}}",
  "nonograma.flashRecord": "Récord Flash: {{time}}s",
  "nonograma.worldRecord": "Récord Mundial: {{time}} (por {{name}})",
  "nonograma.beatWorldRecord": "👑 ¡NUEVO RÉCORD MUNDIAL! 👑",
  "nonograma.currentTime": "Tiempo: {{time}}s",
  "nonograma.victoryMsg": "¡Felicidades! Has completado el nonograma.",
  "nonograma.defeatMsg": "¡Se acabaron las vidas! Inténtalo de nuevo.",
  "nonograma.startNewGame": "Nueva Partida",
  "nonograma.nextRound": "Siguiente Ronda",
  "nonograma.normalDesc": "Elige tamaño y dificultad. Descubre el patrón oculto.",
  "nonograma.mountainDesc": "Supera niveles en orden ascendente: de 5 Fácil a 20 Difícil. 3 vidas por ronda.",
  "nonograma.flashDesc": "Configuración 10x10 Difícil. Cronómetro activo. ¡Supera el récord mundial de 1:45!"
};

// Helper de Traducción Local
const t = (key: string, params?: Record<string, any>) => {
  let text = ES_TRANSLATIONS[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v));
    });
  }
  return text;
};

const NonogramaGame: React.FC = () => {

  // Estados de configuración de juego
  const [activeMode, setActiveMode] = useState<GameMode>('menu');
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<NonogramaDifficulty | null>(null);
  const [mountainRound, setMountainRound] = useState<number>(0); // Índice de 0 a 11

  // Estados de partida
  const [game, setGame] = useState<NonogramaGameType | null>(null);
  const [gridState, setGridState] = useState<CellState[][]>([]);
  const [focusedCell, setFocusedCell] = useState<{ r: number; c: number } | null>(null);
  const [keyboardActive, setKeyboardActive] = useState<boolean>(false);
  const [dpadPressState, setDpadPressState] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({ up: false, down: false, left: false, right: false });
  const [lives, setLives] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [screenGlitch, setScreenGlitch] = useState<boolean>(false);

  // Estados de cronómetro (Modo Flash)
  const [timeMs, setTimeMs] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);

  // Estados de récords locales
  const [mountainRecord, setMountainRecord] = useState<number>(0);
  const [flashPersonalRecord, setFlashPersonalRecord] = useState<number>(0); // en ms
  const [flashWorldRecord, setFlashWorldRecord] = useState<number>(105000); // 1:45 por defecto
  const [flashWorldRecordName, setFlashWorldRecordName] = useState<string>('GAL');
  const [newRecordAlert, setNewRecordAlert] = useState<boolean>(false);
  const [newWorldRecordAlert, setNewWorldRecordAlert] = useState<boolean>(false);

  // Audio sintetizado localmente (Retro Beeps y Sonidos de Mario Bros)
  const playRetroSound = (type: 'click' | 'correct' | 'error' | 'win' | 'lose' | 'coin' | 'jump' | 'powerup' | 'pipe') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Activar destello de pantalla (glitch) al pulsar botones de la Game Boy
      if (['coin', 'powerup', 'pipe'].includes(type)) {
        setScreenGlitch(true);
        setTimeout(() => setScreenGlitch(false), 150);
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      const now = audioCtx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.start();
        osc.stop(now + 0.05);
      } else if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        osc.start();
        osc.stop(now + 0.15);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        osc.start();
        osc.stop(now + 0.3);
      } else if (type === 'win') {
        // Hongo / Powerup ascendente
        const freqs = [330, 392, 659, 523, 587, 783, 1046];
        freqs.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
          noteGain.gain.setValueAtTime(0.05, now + idx * 0.08);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);
          noteOsc.start(now + idx * 0.08);
          noteOsc.stop(now + idx * 0.08 + 0.14);
        });
      } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.5);
        gain.gain.setValueAtTime(0.15, now);
        osc.start();
        osc.stop(now + 0.65);
      } else if (type === 'coin') {
        // Moneda clásica de Super Mario Bros
        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.setValueAtTime(0.06, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'jump') {
        // Salto clásico de Mario Bros
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(650, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'powerup') {
        // Champiñón / Seta Power Up de Mario
        const freqs = [330, 392, 659, 523, 587, 783];
        freqs.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.07);
          noteGain.gain.setValueAtTime(0.05, now + idx * 0.07);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.1);
          noteOsc.start(now + idx * 0.07);
          noteOsc.stop(now + idx * 0.07 + 0.12);
        });
      } else if (type === 'pipe') {
        // Entrar por tubería clásica de Mario
        const freqs = [300, 150, 300, 150];
        freqs.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteOsc.frequency.exponentialRampToValueAtTime(freq - 80, now + idx * 0.1 + 0.08);
          noteGain.gain.setValueAtTime(0.06, now + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.09);
          noteOsc.start(now + idx * 0.1);
          noteOsc.stop(now + idx * 0.1 + 0.1);
        });
      }
    } catch (e) {
      console.warn('Audio Context no soportado', e);
    }
  };

  // Cargar récords de localStorage al montar
  useEffect(() => {
    const savedMountain = localStorage.getItem('nonograma_mountain_record');
    if (savedMountain) setMountainRecord(parseInt(savedMountain));

    const savedPersonalFlash = localStorage.getItem('nonograma_flash_personal_record');
    if (savedPersonalFlash) setFlashPersonalRecord(parseInt(savedPersonalFlash));

    const savedWorldFlash = localStorage.getItem('nonograma_flash_world_record');
    if (savedWorldFlash) setFlashWorldRecord(parseInt(savedWorldFlash));

    const savedWorldFlashName = localStorage.getItem('nonograma_flash_world_record_name');
    if (savedWorldFlashName) setFlashWorldRecordName(savedWorldFlashName);
  }, []);

  // Control de Cronómetro para Modo Flash
  useEffect(() => {
    if (timerRunning) {
      const start = Date.now() - timeMs;
      timerRef.current = window.setInterval(() => {
        setTimeMs(Date.now() - start);
      }, 10);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // Navegación por teclado dentro de la cuadrícula
  useEffect(() => {
    if (activeMode === 'menu' || !game || isGameOver || isGameWon || !focusedCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const size = game.grid.length;
      const { r, c } = focusedCell;

      let nextR = r;
      let nextC = c;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setKeyboardActive(true);
          nextR = Math.max(0, r - 1);
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setKeyboardActive(true);
          nextR = Math.min(size - 1, r + 1);
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setKeyboardActive(true);
          nextC = Math.max(0, c - 1);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setKeyboardActive(true);
          nextC = Math.min(size - 1, c + 1);
          e.preventDefault();
          break;
        case 'Enter':
        case ' ':
          if (keyboardActive) {
            handleCellClick(r, c);
          } else {
            setKeyboardActive(true);
          }
          e.preventDefault();
          break;
        default:
          return;
      }

      if (nextR !== r || nextC !== c) {
        playRetroSound('click');
        setFocusedCell({ r: nextR, c: nextC });
      } else if (['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S', 'ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'].includes(e.key)) {
        playRetroSound('click');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMode, game, isGameOver, isGameWon, focusedCell, keyboardActive]);

  // Escuchar teclado para iluminar la cruceta (D-pad) exterior
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setDpadPressState(prev => prev.up ? prev : { ...prev, up: true });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setDpadPressState(prev => prev.down ? prev : { ...prev, down: true });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setDpadPressState(prev => prev.left ? prev : { ...prev, left: true });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setDpadPressState(prev => prev.right ? prev : { ...prev, right: true });
          break;
        default:
          break;
      }
    };

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          setDpadPressState(prev => !prev.up ? prev : { ...prev, up: false });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setDpadPressState(prev => !prev.down ? prev : { ...prev, down: false });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setDpadPressState(prev => !prev.left ? prev : { ...prev, left: false });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setDpadPressState(prev => !prev.right ? prev : { ...prev, right: false });
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, []);

  // Iniciar una partida
  const startGameInstance = (mode: GameMode, roundIndex: number = 0) => {
    let size: number = 5;
    let diff: NonogramaDifficulty = 'easy';

    if (mode === 'normal') {
      if (selectedSize === null || selectedDifficulty === null) {
        playRetroSound('error');
        return;
      }
      size = selectedSize;
      diff = selectedDifficulty;
    } else if (mode === 'mountain') {
      size = MOUNTAIN_LEVELS[roundIndex].size;
      diff = MOUNTAIN_LEVELS[roundIndex].difficulty;
      setMountainRound(roundIndex);
    } else if (mode === 'flash') {
      size = 10;
      diff = 'hard';
      setTimeMs(0);
    }

    playRetroSound('click');
    setLives(3);
    setIsGameOver(false);
    setIsGameWon(false);
    setNewRecordAlert(false);
    setNewWorldRecordAlert(false);

    const generated = generateNonograma(size, diff);
    setGame(generated);

    // Inicializar estado de la cuadrícula
    const initialGrid: CellState[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => 'hidden')
    );
    setGridState(initialGrid);
    setFocusedCell({ r: 0, c: 0 });
    setKeyboardActive(false);
    setActiveMode(mode);

    if (mode === 'flash') {
      setTimerRunning(true);
    }
  };

  // Manejar click en una celda
  const handleCellClick = (r: number, c: number) => {
    if (!game || isGameOver || isGameWon) return;

    // Comprobación defensiva de límites del tablero
    if (r >= game.grid.length || c >= (game.grid[0]?.length || 0)) return;
    if (!gridState || !gridState[r] || gridState[r][c] !== 'hidden') return;

    setFocusedCell({ r, c });
    setKeyboardActive(false);

    const isCorrect = game.grid[r][c];
    const newGridState = gridState.map((row, ri) =>
      row.map((cell, ci) => {
        if (ri === r && ci === c) {
          return isCorrect ? 'correct' : 'error';
        }
        return cell;
      })
    );

    setGridState(newGridState);

    if (isCorrect) {
      playRetroSound('correct');
      // Comprobar victoria: si todas las casillas pintadas de la solución están reveladas como correctas
      const won = game.grid.every((row, ri) =>
        row.every((cell, ci) => {
          if (cell) {
            // Validación defensiva para evitar accesos a filas/celdas no inicializadas
            return newGridState[ri] && newGridState[ri][ci] === 'correct';
          }
          return true;
        })
      );

      if (won) {
        setIsGameWon(true);
        playRetroSound('win');
        if (activeMode === 'flash') {
          setTimerRunning(false);
          handleFlashVictory();
        } else if (activeMode === 'mountain') {
          const nextRecord = mountainRound + 1;
          if (nextRecord > mountainRecord) {
            setMountainRecord(nextRecord);
            localStorage.setItem('nonograma_mountain_record', nextRecord.toString());
          }
        }
      }
    } else {
      playRetroSound('error');
      const remainingLives = lives - 1;
      setLives(remainingLives);
      if (remainingLives === 0) {
        setIsGameOver(true);
        playRetroSound('lose');
        if (activeMode === 'flash') {
          setTimerRunning(false);
        }
      }
    }
  };

  // Procesar récords al ganar en Modo Flash
  const handleFlashVictory = () => {
    const elapsed = timeMs;

    // Verificar récord personal
    if (flashPersonalRecord === 0 || elapsed < flashPersonalRecord) {
      setFlashPersonalRecord(elapsed);
      localStorage.setItem('nonograma_flash_personal_record', elapsed.toString());
      setNewRecordAlert(true);
    }

    // Verificar récord mundial
    if (elapsed < flashWorldRecord) {
      setFlashWorldRecord(elapsed);
      localStorage.setItem('nonograma_flash_world_record', elapsed.toString());
      setNewWorldRecordAlert(true);
      // Actualizar nombre a "TÚ" o similar
      setFlashWorldRecordName('TÚ');
      localStorage.setItem('nonograma_flash_world_record_name', 'TÚ');
    }
  };

  // Pasar a la siguiente ronda en Modo Montaña
  const nextMountainRound = () => {
    if (mountainRound < MOUNTAIN_LEVELS.length - 1) {
      startGameInstance('mountain', mountainRound + 1);
    } else {
      // Ha completado todo el modo montaña
      setActiveMode('menu');
      playRetroSound('win');
    }
  };

  // Volver al menú
  const returnToMenu = () => {
    playRetroSound('click');
    setTimerRunning(false);
    setActiveMode('menu');
    setGame(null);
    setFocusedCell(null);
  };

  // Resetear la partida actual
  const resetGame = () => {
    if (activeMode === 'mountain') {
      startGameInstance('mountain', mountainRound);
    } else {
      startGameInstance(activeMode);
    }
  };

  // Botón físico Select
  const handleSelectClick = () => {
    playRetroSound('powerup');
    if (activeMode === 'menu') {
      // Rotar tamaño
      setSelectedSize(prev => {
        if (prev === 5) return 10;
        if (prev === 10) return 15;
        if (prev === 15) return 20;
        return 5;
      });
    } else {
      returnToMenu();
    }
  };

  // Botón físico Start
  const handleStartClick = () => {
    playRetroSound('powerup');
    if (activeMode === 'menu') {
      startGameInstance('normal');
    } else {
      resetGame();
    }
  };

  // Formatear tiempo en MM:SS.CC
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const isSPA = !!(window as any).__GALBAHUB_SPA__;
  const galbaHubUrl = isSPA ? '/' : '../';

  return (
    <div className={styles.container}>
      <div className={styles.backHubWrapper}>
        <a 
          href={galbaHubUrl} 
          className={styles.backHubBtn}
        >
          <ArrowLeft size={14} />
          <span>Home</span>
        </a>
      </div>
      <div className={styles.gameBoyFrame}>
        {/* Parte superior del marco (Pantalla) */}
        <div className={styles.screenBezel}>
          <div className={styles.screenHeader}>
            <div className={styles.powerLedContainer}>
              <div className={`${styles.powerLed} ${styles.ledOn}`} />
              <span className={styles.powerLabel}>POWER</span>
            </div>
            <div className={styles.screenTitle}>
              <span className={styles.titleBlue}>G</span>
              <span className={styles.titleRed}>A</span>
              <span className={styles.titleYellow}>L</span>
              <span className={styles.titleGreen}>B</span>
              <span className={styles.titlePurple}>A</span>
              <span className={styles.titleThin}>COLOR</span>
            </div>
          </div>

          <div className={`${styles.screenContent} ${screenGlitch ? styles.screenGlitchActive : ''}`}>
            {activeMode === 'menu' ? (
              /* MENÚ PRINCIPAL */
              <div className={styles.menuScreen}>
                <h1 className={styles.menuTitle}>{t('nonograma.title')}</h1>

                <div className={styles.menuContent}>
                  <div className={styles.modeSection}>
                    <h3 className={styles.sectionLabel}>{t('nonograma.mode')}</h3>
                    <div className={styles.modeGrid}>
                      <button
                        className={styles.retroButton}
                        onClick={() => startGameInstance('normal')}
                      >
                        {t('nonograma.modeNormal')}
                      </button>
                      <button
                        className={styles.retroButton}
                        onClick={() => startGameInstance('mountain', 0)}
                      >
                        {t('nonograma.modeMountain')}
                      </button>
                      <button
                        className={styles.retroButton}
                        onClick={() => startGameInstance('flash')}
                      >
                        {t('nonograma.modeFlash')}
                      </button>
                    </div>
                  </div>

                  {/* Configuración Modo Normal */}
                  <div className={styles.configBox}>
                    <div className={styles.configOption}>
                      <span className={styles.optionLabel}>{t('common.size')}:</span>
                      <div className={styles.optionGrid}>
                        {[5, 10, 15, 20].map(s => (
                          <button
                            key={s}
                            className={`${styles.sizeButton} ${selectedSize === s ? styles.selected : ''}`}
                            onClick={() => { playRetroSound('click'); setSelectedSize(s); }}
                          >
                            {s}x{s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.configOption}>
                      <span className={styles.optionLabel}>{t('common.difficulty')}:</span>
                      <div className={styles.optionGrid}>
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                          <button
                            key={d}
                            className={`${styles.diffButton} ${selectedDifficulty === d ? styles.selected : ''}`}
                            onClick={() => { playRetroSound('click'); setSelectedDifficulty(d); }}
                          >
                            {t(`common.${d}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sección de Récords */}
                  <div className={styles.recordsBox}>
                    <div className={styles.recordItem}>
                      <Trophy size={14} className={styles.trophyIcon} />
                      <span>{t('nonograma.consecutiveRecord', { round: mountainRecord })}</span>
                    </div>
                    <div className={styles.recordItem}>
                      <Timer size={14} className={styles.timerIcon} />
                      <span>
                        {t('nonograma.flashRecord', {
                          time: flashPersonalRecord > 0 ? formatTime(flashPersonalRecord) : '--:--.--'
                        })}
                      </span>
                    </div>
                    <div className={styles.recordItem}>
                      <Trophy size={14} className={styles.worldTrophyIcon} />
                      <span className={styles.worldRecordText}>
                        {t('nonograma.worldRecord', {
                          time: formatTime(flashWorldRecord),
                          name: flashWorldRecordName
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.startButtonContainer}>
                  <button 
                    className={styles.mainStartBtn}
                    onClick={() => startGameInstance('normal')}
                  >
                    PRESS START
                  </button>
                </div>
              </div>
            ) : (
              /* PANTALLA DE JUEGO ACTIVO */
              <div className={styles.gameScreen}>
                {/* HUD Superior */}
                <div className={styles.hud}>
                  <button className={styles.hudBackBtn} onClick={returnToMenu}>
                    <ArrowLeft size={16} />
                  </button>

                  <div className={styles.hudCenter}>
                    {activeMode === 'normal' && (
                      <span className={styles.hudMode}>
                        {selectedSize}x{selectedSize} - {t(`common.${selectedDifficulty}`)}
                      </span>
                    )}
                    {activeMode === 'mountain' && (
                      <span className={styles.hudMode}>
                        {t('nonograma.round', { round: mountainRound + 1 })} ({MOUNTAIN_LEVELS[mountainRound].label})
                      </span>
                    )}
                    {activeMode === 'flash' && (
                      <div className={styles.hudTimer}>
                        <Timer size={14} />
                        <span>{formatTime(timeMs)}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.hudStatus}>
                    <div className={styles.livesContainer}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Heart
                          key={i}
                          size={16}
                          className={`${styles.heartIcon} ${i < lives ? styles.heartActive : styles.heartEmpty}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Área de Juego: Tablero y Pistas */}
                {game && (
                  <div className={styles.boardWrapper}>
                    <div
                      className={styles.nonogramaGridContainer}
                      style={{
                        '--grid-size': game.grid.length,
                      } as React.CSSProperties}
                    >
                      {/* Esquina superior izquierda */}
                      <div className={styles.cornerCell}>
                        <Gamepad2 size={24} className={styles.cornerIcon} />
                      </div>

                      {/* Pistas de columnas (arriba) */}
                      <div className={styles.colCluesContainer}>
                        {game.colClues.map((clues, cIdx) => (
                          <div 
                            key={cIdx} 
                            className={`${styles.colClueColumn} ${(cIdx + 1) % 5 === 0 && cIdx !== game.grid.length - 1 ? styles.thickRightBorder : ''}`}
                          >
                            {clues.map((clue, idx) => (
                              <span key={idx} className={styles.clueNumber}>
                                {clue}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Pistas de filas (izquierda) */}
                      <div className={styles.rowCluesContainer}>
                        {game.rowClues.map((clues, rIdx) => (
                          <div 
                            key={rIdx} 
                            className={`${styles.rowClueRow} ${(rIdx + 1) % 5 === 0 && rIdx !== game.grid.length - 1 ? styles.thickBottomBorder : ''}`}
                          >
                            {clues.map((clue, idx) => (
                              <span key={idx} className={styles.clueNumber}>
                                {clue}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>

                      {/* Tablero Principal */}
                      <div className={styles.gridBoard}>
                        {gridState.map((row, rIdx) =>
                          row.map((cellState, cIdx) => {
                            const isThickRight = (cIdx + 1) % 5 === 0 && cIdx !== game.grid.length - 1;
                            const isThickBottom = (rIdx + 1) % 5 === 0 && rIdx !== game.grid.length - 1;
                            
                            const isFocused = keyboardActive && focusedCell && focusedCell.r === rIdx && focusedCell.c === cIdx;
                            
                            return (
                              <button
                                key={`${rIdx}-${cIdx}`}
                                className={`
                                  ${styles.gridCell}
                                  ${cellState === 'correct' ? styles.cellCorrect : ''}
                                  ${cellState === 'error' ? styles.cellError : ''}
                                  ${isThickRight ? styles.thickRightBorder : ''}
                                  ${isThickBottom ? styles.thickBottomBorder : ''}
                                  ${isFocused ? styles.cellFocused : ''}
                                `}
                                onClick={() => handleCellClick(rIdx, cIdx)}
                                disabled={isGameOver || isGameWon}
                                aria-label={`Celda fila ${rIdx + 1} columna ${cIdx + 1}`}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modales / Pantallas de estado de fin de partida */}
                {isGameWon && (
                  <div className={`${styles.statusOverlay} ${styles.winOverlay}`}>
                    <div className={styles.overlayContent}>
                      <Trophy size={48} className={styles.winTrophy} />
                      <h2>{t('common.victory')}</h2>
                      <p>{t('nonograma.victoryMsg')}</p>

                      {activeMode === 'flash' && (
                        <div className={styles.flashResultBox}>
                          <p>{t('nonograma.currentTime', { time: formatTime(timeMs) })}</p>
                          {newWorldRecordAlert && (
                            <div className={styles.worldRecordBadge}>
                              {t('nonograma.beatWorldRecord')}
                            </div>
                          )}
                          {!newWorldRecordAlert && newRecordAlert && (
                            <div className={styles.personalRecordBadge}>
                              🎉 ¡NUEVA MEJOR MARCA! 🎉
                            </div>
                          )}
                        </div>
                      )}

                      {activeMode === 'mountain' ? (
                        <button className={styles.actionBtn} onClick={nextMountainRound}>
                          {mountainRound < MOUNTAIN_LEVELS.length - 1
                            ? t('nonograma.nextRound')
                            : '¡COMPLETADO! VER MENÚ'}
                        </button>
                      ) : (
                        <div className={styles.overlayButtons}>
                          <button className={styles.actionBtn} onClick={resetGame}>
                            <RefreshCw size={14} /> {t('common.restart')}
                          </button>
                          <button className={styles.actionBtn} onClick={returnToMenu}>
                            {t('common.back')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isGameOver && (
                  <div className={`${styles.statusOverlay} ${styles.loseOverlay}`}>
                    <div className={styles.overlayContent}>
                      <div className={styles.skullPlaceholder}>💀</div>
                      <h2>{t('common.defeat')}</h2>
                      <p>{t('nonograma.defeatMsg')}</p>

                      {activeMode === 'mountain' && (
                        <p className={styles.mountainEndStats}>
                          Llegaste hasta la Ronda {mountainRound + 1}
                        </p>
                      )}

                      <div className={styles.overlayButtons}>
                        <button className={styles.actionBtn} onClick={resetGame}>
                          <RefreshCw size={14} /> {t('common.restart')}
                        </button>
                        <button className={styles.actionBtn} onClick={returnToMenu}>
                          {t('common.back')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mandos Izquierdos */}
        <div className={styles.leftControls}>
          <div className={styles.brandContainer}>
            <span className={styles.brandText}>GalbaGrama*</span>
          </div>

          {/* D-Pad (Cruceta) */}
          <div className={styles.dpad}>
            <div className={`${styles.dpadDirection} ${styles.dpadUp} ${dpadPressState.up ? styles.pressed : ''}`} />
            <div className={`${styles.dpadDirection} ${styles.dpadDown} ${dpadPressState.down ? styles.pressed : ''}`} />
            <div className={`${styles.dpadDirection} ${styles.dpadLeft} ${dpadPressState.left ? styles.pressed : ''}`} />
            <div className={`${styles.dpadDirection} ${styles.dpadRight} ${dpadPressState.right ? styles.pressed : ''}`} />
            <div className={styles.dpadCenter} />
          </div>

          {/* Sonido On/Off */}
          <div className={styles.volumeController}>
            <button 
              className={styles.volumeBtn} 
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Mandos Derechos */}
        <div className={styles.rightControls}>
          {/* Botones A y B */}
          <div className={styles.actionButtons}>
            <div className={styles.actionButtonLabelWrapper}>
              <button className={`${styles.gameBoyBtn} ${styles.btnB}`} onClick={() => { playRetroSound('pipe'); returnToMenu(); }}>
                B
              </button>
              <span className={styles.btnLabel}>BACK</span>
            </div>
            <div className={styles.actionButtonLabelWrapper}>
              <button className={`${styles.gameBoyBtn} ${styles.btnA}`} onClick={() => { playRetroSound('coin'); resetGame(); }}>
                A
              </button>
              <span className={styles.btnLabel}>RETRY</span>
            </div>
          </div>

          {/* Ranuras del altavoz */}
          <div className={styles.speakerGrille}>
            <div className={styles.speakerSlot} />
            <div className={styles.speakerSlot} />
            <div className={styles.speakerSlot} />
            <div className={styles.speakerSlot} />
            <div className={styles.speakerSlot} />
          </div>
        </div>

        {/* Botones Select y Start (debajo de la pantalla) */}
        <div className={styles.systemButtons}>
          <div className={styles.sysBtnWrapper}>
            <button className={styles.sysBtn} onClick={handleSelectClick} />
            <span className={styles.sysLabel}>SELECT</span>
          </div>
          <div className={styles.sysBtnWrapper}>
            <button className={styles.sysBtn} onClick={handleStartClick} />
            <span className={styles.sysLabel}>START</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NonogramaGame;
