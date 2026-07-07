import { describe, it, expect } from 'vitest';
import {
  generateMatricula,
  validateMathExpression,
  validateLettersInWord,
  solveMathChallenge
} from '@galbahub/domain';

describe('Juego 1: Expresiones Matemáticas de Matrícula', () => {
  it('debe validar fórmulas matemáticas correctas que sumen exactamente 10', () => {
    // Caso 1: Fórmula simple válida para dígitos 3, 4, 5, 2
    const res1 = validateMathExpression('5 * (2 / (4 - 3))', '3452');
    expect(res1.valid).toBe(true);
    expect(res1.value).toBe(10);

    // Caso 2: Otra fórmula válida
    const res2 = validateMathExpression('(5 - 3) * 4 + 2', '3452');
    expect(res2.valid).toBe(true);
    expect(res2.value).toBe(10);
  });

  it('debe detectar errores en dígitos usados', () => {
    // Caso 1: Faltan números
    const res = validateMathExpression('5 * 2', '3452');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Debes usar exactamente los dígitos');

    // Caso 2: Dígitos no presentes en la matrícula
    const res2 = validateMathExpression('5 * 2 + 1 - 1', '3452');
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('Debes usar exactamente los dígitos');
  });

  it('debe evitar divisiones por cero', () => {
    const res = validateMathExpression('3 / (4 - 4) * 5', '3445');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('División por cero');
  });

  it('debe detectar resultados que no sean 10', () => {
    const res = validateMathExpression('3 + 4 + 5 + 2', '3452');
    expect(res.valid).toBe(true);
    expect(res.value).toBe(14); // Es matemáticamente correcta pero no suma 10
  });

  it('debe encontrar una solución si existe', () => {
    const sol = solveMathChallenge([3, 4, 5, 2]);
    expect(sol).not.toBeNull();
    // La expresión resuelta debe evaluarse a 10
    const evalSol = validateMathExpression(sol!, '3452');
    expect(evalSol.valid).toBe(true);
    expect(evalSol.value).toBe(10);
  });
});

describe('Juego 2: Validación de Letras en Palabras', () => {
  it('debe validar palabras que contengan las letras en orden', () => {
    // Caso: CRT en cartera
    const res1 = validateLettersInWord('cartera', 'CRT');
    expect(res1.valid).toBe(true);
    expect(res1.matchIndices).toEqual([0, 2, 3]); // c=0, r=2, t=3 en 'cartera'

    // Caso: CRT en cresta
    const res2 = validateLettersInWord('cresta', 'CRT');
    expect(res2.valid).toBe(true);
    expect(res2.matchIndices).toEqual([0, 1, 4]); // c=0, r=1, t=4 en 'cresta'
  });

  it('debe rechazar palabras que no contengan las letras en el orden especificado', () => {
    // Caso: TRuCo para CRT (contiene R y T en orden pero la C va después)
    const res = validateLettersInWord('truco', 'CRT');
    expect(res.valid).toBe(false);

    // Caso: ReCTo para CRT
    const res2 = validateLettersInWord('recto', 'CRT');
    expect(res2.valid).toBe(false);
  });
});

describe('Generador de Matrícula', () => {
  it('debe generar matrículas solubles', () => {
    const game = generateMatricula();
    expect(game.digits).toHaveLength(4);
    expect(game.letters).toHaveLength(3);
    expect(game.solution).not.toBeNull();

    // Comprobar que la solución sugerida es correcta
    const valResult = validateMathExpression(game.solution, game.digits);
    expect(valResult.valid).toBe(true);
    expect(valResult.value).toBe(10);
  });
});
