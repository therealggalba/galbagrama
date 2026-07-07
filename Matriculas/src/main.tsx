import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        "common": {
          "victory": "¡Victoria!",
          "defeat": "¡Derrota!",
          "restart": "Reiniciar",
          "difficulty": "Dificultad",
          "back": "Volver"
        },
        "matriculas": {
          "title": "🚗 RETRO MATRÍCULAS",
          "subtitle": "JUEGO DE LA MATRÍCULA",
          "licensePlate": "Matrícula",
          "juego1Title": "Juego 1: Sumar 10",
          "juego1Desc": "Usa los 4 dígitos exactamente una vez para hacer exactamente 10.",
          "juego2Title": "Juego 2: Palabras en Orden",
          "juego2Desc": "Escribe una palabra en español que contenga las 3 letras en el mismo orden.",
          "inputFormula": "Ingresa tu fórmula...",
          "inputWord": "Ingresa tu palabra...",
          "evaluate": "Evaluar",
          "hint": "Pedir Pista",
          "nextPlate": "Siguiente Matrícula",
          "formulaResult": "Resultado: {{val}}",
          "wordValid": "¡Palabra en orden!",
          "wordInvalid": "Letras no coinciden o no están en orden.",
          "wordNotFound": "Palabra no encontrada en el diccionario. ¿Aceptar palabra manual?",
          "acceptWord": "Aceptar Palabra",
          "personalRecord": "Récord Personal: {{score}} matrículas",
          "currentScore": "Matrículas Resueltas: {{score}}",
          "errorDigits": "Debes usar cada dígito exactamente una vez.",
          "errorMath": "Expresión inválida o división por cero.",
          "errorResult": "El resultado no es 10."
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
