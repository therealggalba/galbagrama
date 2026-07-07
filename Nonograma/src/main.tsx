import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Configuración básica local de i18n para desarrollo independiente
i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        "common": {
          "victory": "¡Victoria!",
          "defeat": "¡Derrota!",
          "restart": "Reiniciar",
          "lives": "Vidas",
          "difficulty": "Dificultad",
          "size": "Tamaño",
          "easy": "Fácil",
          "medium": "Medio",
          "hard": "Difícil",
          "back": "Volver"
        },
        "nonograma": {
          "title": "🎮 RETRO NONOGRAMA",
          "mode": "Modo de Juego",
          "modeNormal": "Normal",
          "modeMountain": "Montaña",
          "modeFlash": "Flash",
          "livesCount": "Vidas",
          "scoreRecord": "Récord: {{score}}",
          "round": "Ronda {{round}}",
          "consecutiveRecord": "Récord Montaña: Ronda {{round}}",
          "flashRecord": "Récord Flash: {{time}}s",
          "worldRecord": "Récord Mundial: {{time}} (por {{name}})",
          "beatWorldRecord": "👑 ¡NUEVO RÉCORD MUNDIAL! 👑",
          "currentTime": "Tiempo: {{time}}s",
          "victoryMsg": "¡Felicidades! Has completado el nonograma.",
          "defeatMsg": "¡Se acabaron las vidas! Inténtalo de nuevo.",
          "startNewGame": "Nueva Partida",
          "nextRound": "Siguiente Ronda",
          "normalDesc": "Elige tamaño y dificultad. Descubre el patrón oculto.",
          "mountainDesc": "Supera niveles en orden ascendente: de 5 Fácil a 20 Difícil. 3 vidas por ronda.",
          "flashDesc": "Configuración 10x10 Difícil. Cronómetro activo. ¡Supera el récord mundial de 1:45!"
        }
      }
    }
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
