import React, { useState, useEffect } from 'react';
import {
  generateMatricula,
  validateMathExpression,
  validateLettersInWord,
  MatriculaGame
} from '@galbahub/domain';
import { Trophy, Volume2, VolumeX, ArrowLeft, RefreshCw, Star, CheckCircle, AlertTriangle } from 'lucide-react';
import wordList from '../assets/words-es.json';
import styles from './MatriculasGame.module.scss';

// Convertir el JSON de palabras a un Set para búsquedas O(1) rápidas
const SPANISH_WORDS_SET = new Set(wordList);

// Mapa de Traducciones Locales (Castellano)
const ES_TRANSLATIONS: Record<string, string> = {
  "common.victory": "¡Victoria!",
  "common.defeat": "¡Derrota!",
  "common.restart": "Reiniciar",
  "common.difficulty": "Dificultad",
  "common.back": "Volver",
  "matriculas.title": "🚗 RETRO MATRÍCULAS",
  "matriculas.subtitle": "JUEGO DE LA MATRÍCULA",
  "matriculas.licensePlate": "Matrícula",
  "matriculas.juego1Title": "Juego 1: Sumar 10",
  "matriculas.juego1Desc": "Usa los 4 dígitos exactamente una vez para hacer exactamente 10.",
  "matriculas.juego2Title": "Juego 2: Palabras en Orden",
  "matriculas.juego2Desc": "Escribe una palabra en español que contenga las 3 letras en el mismo orden.",
  "matriculas.inputFormula": "Ingresa tu fórmula...",
  "matriculas.inputWord": "Ingresa tu palabra...",
  "matriculas.evaluate": "Evaluar",
  "matriculas.hint": "Pedir Pista",
  "matriculas.nextPlate": "Siguiente Matrícula",
  "matriculas.formulaResult": "Resultado: {{val}}",
  "matriculas.wordValid": "¡Palabra en orden!",
  "matriculas.wordInvalid": "Letras no coinciden o no están en orden.",
  "matriculas.wordNotFound": "Palabra no encontrada en el diccionario. ¿Aceptar palabra manual?",
  "matriculas.acceptWord": "Aceptar Palabra",
  "matriculas.personalRecord": "Récord Personal: {{score}} matrículas",
  "matriculas.currentScore": "Matrículas Resueltas: {{score}}",
  "matriculas.errorDigits": "Debes usar cada dígito exactamente una vez.",
  "matriculas.errorMath": "Expresión inválida o división por cero.",
  "matriculas.errorResult": "El resultado no es 10."
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

const MatriculasGame: React.FC = () => {
  // Estados del juego
  const [game, setGame] = useState<MatriculaGame | null>(null);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [wordInput, setWordInput] = useState<string>('');
  
  // Estados de validación
  const [mathError, setMathError] = useState<string | null>(null);
  const [mathValue, setMathValue] = useState<number | null>(null);
  const [isMathSolved, setIsMathSolved] = useState<boolean>(false);

  const [wordError, setWordError] = useState<string | null>(null);
  const [isWordSolved, setIsWordSolved] = useState<boolean>(false);
  const [wordMatchIndices, setWordMatchIndices] = useState<number[]>([]);
  const [showForceAccept, setShowForceAccept] = useState<boolean>(false);

  // Estados generales
  const [score, setScore] = useState<number>(0);
  const [personalRecord, setPersonalRecord] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [screenGlitch, setScreenGlitch] = useState<boolean>(false);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  
  // Estado para la cruceta D-pad (D-pad press state)
  const [dpadPressState, setDpadPressState] = useState<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }>({ up: false, down: false, left: false, right: false });

  // Audio sintetizado (efectos retro de Game Boy)
  const playRetroSound = (type: 'click' | 'correct' | 'error' | 'win' | 'powerup' | 'pipe') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Destello de pantalla (glitch)
      if (['win', 'powerup', 'pipe'].includes(type)) {
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
        gain.gain.setValueAtTime(0.04, now);
        osc.start();
        osc.stop(now + 0.05);
      } else if (type === 'correct') {
        // Sonido ascendente doble
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.08, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        osc.start();
        osc.stop(now + 0.25);
      } else if (type === 'win') {
        // Moneda clásica + Fanfarria retro corta
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.08);
          noteGain.gain.setValueAtTime(0.05, now + idx * 0.08);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
          noteOsc.start(now + idx * 0.08);
          noteOsc.stop(now + idx * 0.08 + 0.2);
        });
      } else if (type === 'powerup') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(990, now + 0.2);
        gain.gain.setValueAtTime(0.05, now);
        osc.start();
        osc.stop(now + 0.25);
      } else if (type === 'pipe') {
        const freqs = [300, 150, 300, 150];
        freqs.forEach((freq, idx) => {
          const noteOsc = audioCtx.createOscillator();
          const noteGain = audioCtx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(audioCtx.destination);
          noteOsc.type = 'square';
          noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
          noteGain.gain.setValueAtTime(0.05, now + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.08);
          noteOsc.start(now + idx * 0.1);
          noteOsc.stop(now + idx * 0.1 + 0.1);
        });
      }
    } catch (e) {
      console.warn('Audio Context no soportado', e);
    }
  };

  // Cargar récord de localStorage al iniciar
  useEffect(() => {
    const savedRecord = localStorage.getItem('matriculas_personal_record');
    if (savedRecord) {
      setPersonalRecord(parseInt(savedRecord, 10));
    }
    startNewGame();
  }, []);

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

  // Iniciar nueva ronda de matrícula
  const startNewGame = () => {
    const newGame = generateMatricula();
    setGame(newGame);
    setFormulaInput('');
    setWordInput('');
    setMathError(null);
    setMathValue(null);
    setIsMathSolved(false);
    setWordError(null);
    setIsWordSolved(false);
    setWordMatchIndices([]);
    setShowForceAccept(false);
    setIsGameWon(false);
    setShowHint(false);
    playRetroSound('powerup');
  };

  // Validar el Juego 1 (Matemático) en tiempo real
  useEffect(() => {
    if (!game || !formulaInput.trim()) {
      setMathError(null);
      setMathValue(null);
      setIsMathSolved(false);
      return;
    }

    const result = validateMathExpression(formulaInput, game.digits);
    if (!result.valid) {
      setMathError(result.error || 'Fórmula incorrecta');
      setMathValue(null);
      setIsMathSolved(false);
    } else {
      setMathError(null);
      setMathValue(result.value !== undefined ? result.value : null);
      
      // Comprobar si el valor es exactamente 10
      const isExactlyTen = result.value !== undefined && Math.abs(result.value - 10) < 1e-7;
      if (isExactlyTen) {
        if (!isMathSolved) {
          setIsMathSolved(true);
          playRetroSound('correct');
        }
      } else {
        setIsMathSolved(false);
      }
    }
  }, [formulaInput, game]);

  // Validar el Juego 2 (Palabras) en tiempo real
  useEffect(() => {
    if (!game || !wordInput.trim()) {
      setWordError(null);
      setIsWordSolved(false);
      setWordMatchIndices([]);
      setShowForceAccept(false);
      return;
    }

    const word = wordInput.trim().toLowerCase();
    const normalizedWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const { valid, matchIndices } = validateLettersInWord(word, game.letters);
    
    setWordMatchIndices(matchIndices);

    if (!valid) {
      setWordError(t('matriculas.wordInvalid'));
      setIsWordSolved(false);
      setShowForceAccept(false);
    } else {
      // Las letras están en orden. Ahora comprobar si la palabra está en nuestro diccionario
      const isInDictionary = SPANISH_WORDS_SET.has(normalizedWord);
      if (isInDictionary) {
        setWordError(null);
        setShowForceAccept(false);
        if (!isWordSolved) {
          setIsWordSolved(true);
          playRetroSound('correct');
        }
      } else {
        setWordError(t('matriculas.wordNotFound'));
        setIsWordSolved(false);
        setShowForceAccept(true); // Permitir botón para forzar aceptación
      }
    }
  }, [wordInput, game]);

  // Manejar resolución de ambos juegos (Victoria)
  useEffect(() => {
    if (isMathSolved && isWordSolved && !isGameWon) {
      setIsGameWon(true);
      playRetroSound('win');
      const newScore = score + 1;
      setScore(newScore);

      if (newScore > personalRecord) {
        setPersonalRecord(newScore);
        localStorage.setItem('matriculas_personal_record', newScore.toString());
      }
    }
  }, [isMathSolved, isWordSolved]);

  // Forzar aceptación manual de una palabra del jugador
  const handleForceAcceptWord = () => {
    if (wordInput.trim() && wordMatchIndices.length === 3) {
      playRetroSound('correct');
      setWordError(null);
      setIsWordSolved(true);
      setShowForceAccept(false);
    }
  };

  // Agregar caracteres en el input matemático mediante botones interactivos
  const handleMathBtnClick = (char: string) => {
    playRetroSound('click');
    setFormulaInput(prev => prev + char);
  };

  const handleBackspace = () => {
    playRetroSound('click');
    setFormulaInput(prev => prev.slice(0, -1));
  };

  const handleClearFormula = () => {
    playRetroSound('click');
    setFormulaInput('');
  };

  // Renderizar la palabra del Juego 2 resaltando las letras clave
  const renderHighlightedWord = () => {
    if (!wordInput) return null;
    const chars = wordInput.split('');
    return (
      <div className={styles.highlightedWord}>
        {chars.map((char, idx) => {
          const isMatched = wordMatchIndices.includes(idx);
          return (
            <span key={idx} className={isMatched ? styles.letterMatch : styles.letterNormal}>
              {char}
            </span>
          );
        })}
      </div>
    );
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
      <div className={`${styles.gameBoyFrame} ${screenGlitch ? styles.glitchEffect : ''}`}>
        
        {/* Panel Izquierdo: Botones retro decorativos (Cruceta D-Pad) */}
        <div className={styles.leftControls}>
          <div className={styles.dpad}>
            <div className={`${styles.dpadDirection} ${styles.dpadUp} ${dpadPressState.up ? styles.pressed : ''}`} />
            <div className={`${styles.dpadDirection} ${styles.dpadLeft} ${dpadPressState.left ? styles.pressed : ''}`} />
            <div className={styles.dpadCenter}></div>
            <div className={`${styles.dpadDirection} ${styles.dpadRight} ${dpadPressState.right ? styles.pressed : ''}`} />
            <div className={`${styles.dpadDirection} ${styles.dpadDown} ${dpadPressState.down ? styles.pressed : ''}`} />
          </div>
          <span className={styles.retroBrand}>GALBA</span>
        </div>

        {/* Pantalla de la Game Boy */}
        <div className={styles.screenBezel}>
          <header className={styles.screenHeader}>
            <div className={styles.powerLedContainer}>
              <div className={`${styles.powerLed} ${soundEnabled ? styles.ledOn : ''}`}></div>
              <span className={styles.ledLabel}>POWER</span>
            </div>
            <h2 className={styles.screenTitle}>{t('matriculas.title')}</h2>
            <button 
              className={styles.soundBtn} 
              onClick={() => { setSoundEnabled(!soundEnabled); playRetroSound('click'); }}
              title="Alternar Sonido"
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          </header>

          <div className={styles.screenContent}>
            
            {/* Cabecera del juego: Placa de Matrícula y Estado */}
            <div className={styles.matriculaDisplay}>
              {game && (
                <div className={styles.licensePlateContainer}>
                  <div className={styles.euBand}>
                    <div className={styles.euStars}>★<br/>★<br/>★</div>
                    <span className={styles.euCountry}>E</span>
                  </div>
                  <div className={styles.plateNumbers}>{game.digits}</div>
                  <div className={styles.plateLetters}>{game.letters}</div>
                </div>
              )}
              
              <div className={styles.scoreRow}>
                <div className={styles.scoreBox}>
                  <Trophy size={12} className={styles.trophyIcon} />
                  <span>RECORD: {personalRecord}</span>
                </div>
                <div className={styles.scoreBox}>
                  <Star size={12} className={styles.starIcon} />
                  <span>SOLVED: {score}</span>
                </div>
              </div>
            </div>

            {/* Zonas de juego divididas en dos columnas */}
            <div className={styles.gameZones}>
              
              {/* JUEGO 1: MATEMÁTICO */}
              <div className={`${styles.gameZone} ${isMathSolved ? styles.zoneSolved : ''}`}>
                <div className={styles.zoneHeader}>
                  <h3>{t('matriculas.juego1Title')}</h3>
                  {isMathSolved && <CheckCircle size={14} className={styles.solvedIcon} />}
                </div>
                <p className={styles.zoneDesc}>{t('matriculas.juego1Desc')}</p>
                
                <div className={styles.mathChips}>
                  {game?.digits.split('').map((digit, idx) => {
                    // Contar si el dígito ya fue usado en la expresión para atenuarlo
                    const occurrencesInInput = (formulaInput.match(new RegExp(digit, 'g')) || []).length;
                    const occurrencesInPlate = (game.digits.match(new RegExp(digit, 'g')) || []).length;
                    const isUsed = occurrencesInInput >= occurrencesInPlate;

                    return (
                      <button 
                        key={idx} 
                        className={`${styles.digitChip} ${isUsed ? styles.chipUsed : ''}`}
                        onClick={() => handleMathBtnClick(digit)}
                        disabled={isMathSolved}
                      >
                        {digit}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.mathInputRow}>
                  <input
                    type="text"
                    className={`${styles.retroInput} ${mathError ? styles.inputError : ''} ${isMathSolved ? styles.inputSuccess : ''}`}
                    placeholder={t('matriculas.inputFormula')}
                    value={formulaInput}
                    onChange={(e) => setFormulaInput(e.target.value)}
                    disabled={isMathSolved}
                  />
                  {formulaInput && (
                    <button className={styles.clearBtn} onClick={handleClearFormula} disabled={isMathSolved}>
                      C
                    </button>
                  )}
                </div>

                {/* Teclado en pantalla de operadores */}
                <div className={styles.operatorKeys}>
                  {['+', '-', '*', '/', '(', ')'].map((op) => (
                    <button 
                      key={op} 
                      className={styles.opKey} 
                      onClick={() => handleMathBtnClick(op)}
                      disabled={isMathSolved}
                    >
                      {op === '*' ? '×' : op === '/' ? '÷' : op}
                    </button>
                  ))}
                  <button 
                    className={styles.backspaceKey} 
                    onClick={handleBackspace}
                    disabled={isMathSolved}
                  >
                    ⌫
                  </button>
                </div>

                {/* Estado de validación matemática */}
                <div className={styles.validationFeedback}>
                  {mathError && <span className={styles.errorText}>{mathError}</span>}
                  {mathValue !== null && !mathError && (
                    <span className={mathValue === 10 ? styles.successText : styles.infoText}>
                      {t('matriculas.formulaResult', { val: mathValue })}
                    </span>
                  )}
                </div>
              </div>

              {/* JUEGO 2: PALABRAS */}
              <div className={`${styles.gameZone} ${isWordSolved ? styles.zoneSolved : ''}`}>
                <div className={styles.zoneHeader}>
                  <h3>{t('matriculas.juego2Title')}</h3>
                  {isWordSolved && <CheckCircle size={14} className={styles.solvedIcon} />}
                </div>
                <p className={styles.zoneDesc}>{t('matriculas.juego2Desc')}</p>

                <div className={styles.wordTargetLetters}>
                  {game?.letters.split('').map((letter, idx) => (
                    <span key={idx} className={styles.targetLetter}>
                      {letter}
                    </span>
                  ))}
                </div>

                <input
                  type="text"
                  className={`${styles.retroInput} ${wordError && !showForceAccept ? styles.inputError : ''} ${isWordSolved ? styles.inputSuccess : ''}`}
                  placeholder={t('matriculas.inputWord')}
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, ''))}
                  disabled={isWordSolved}
                />

                {/* Previsualización interactiva con letras resaltadas */}
                <div className={styles.wordPreviewArea}>
                  {renderHighlightedWord()}
                </div>

                {/* Estado de validación de palabras */}
                <div className={styles.validationFeedback}>
                  {wordError && (
                    <div className={styles.errorContainer}>
                      {showForceAccept ? (
                        <div className={styles.forceAcceptRow}>
                          <AlertTriangle size={14} className={styles.warningIcon} />
                          <span className={styles.warningText}>{wordError}</span>
                          <button 
                            className={styles.forceBtn}
                            onClick={handleForceAcceptWord}
                          >
                            {t('matriculas.acceptWord')}
                          </button>
                        </div>
                      ) : (
                        <span className={styles.errorText}>{wordError}</span>
                      )}
                    </div>
                  )}
                  {isWordSolved && <span className={styles.successText}>{t('matriculas.wordValid')}</span>}
                </div>
              </div>

            </div>

            {/* Modal/Pantalla de victoria parcial o pista */}
            {isGameWon && (
              <div className={styles.victoryBanner}>
                <div className={styles.victoryTitle}>🎉 MATRÍCULA COMPLETADA 🎉</div>
                <button className={styles.nextBtn} onClick={startNewGame}>
                  {t('matriculas.nextPlate')}
                </button>
              </div>
            )}

            {showHint && game && (
              <div className={styles.hintBanner}>
                <div className={styles.hintText}>
                  Fórmula matemática ejemplo:<br/>
                  <strong>{game.solution}</strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Botones A/B de Game Boy */}
        <div className={styles.rightControls}>
          <div className={styles.actionButtons}>
            <div className={styles.actionBtnContainer}>
              <div 
                className={styles.buttonB} 
                onClick={() => {
                  playRetroSound('click');
                  if (!isGameWon) {
                    if (wordInput) setWordInput('');
                    else handleClearFormula();
                  }
                }}
              ></div>
              <span className={styles.buttonLabel}>B</span>
            </div>
            <div className={styles.actionBtnContainer}>
              <div 
                className={styles.buttonA} 
                onClick={() => {
                  if (isGameWon) {
                    startNewGame();
                  } else {
                    playRetroSound('click');
                  }
                }}
              ></div>
              <span className={styles.buttonLabel}>A</span>
            </div>
          </div>
          <span className={styles.retroSystem}>SYSTEM</span>
        </div>

        {/* Botones SELECT / START en el chasis inferior */}
        <div className={styles.bottomControls}>
          <button 
            className={styles.lobbyBackBtn} 
            onClick={() => {
              playRetroSound('pipe');
              setTimeout(() => {
                window.location.href = '../';
              }, 400);
            }}
          >
            <ArrowLeft size={16} />
            <span>EXIT LOBBY</span>
          </button>

          <div className={styles.selectStartContainer}>
            <div className={styles.consoleButtonContainer}>
              <button 
                className={styles.consoleBtnSelect} 
                onClick={() => {
                  playRetroSound('click');
                  setShowHint(!showHint);
                }}
              ></button>
              <span className={styles.consoleBtnLabel}>SELECT (HINT)</span>
            </div>

            <div className={styles.consoleButtonContainer}>
              <button 
                className={styles.consoleBtnStart} 
                onClick={() => {
                  playRetroSound('pipe');
                  startNewGame();
                }}
              ></button>
              <span className={styles.consoleBtnLabel}>START (RESET)</span>
            </div>
          </div>
          
          <button className={styles.restartBtn} onClick={startNewGame}>
            <RefreshCw size={14} />
            <span>RESTART</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default MatriculasGame;
