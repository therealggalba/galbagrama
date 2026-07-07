import { describe, it, expect } from 'vitest';
import {
  calculateLineClues,
  calculateRowClues,
  calculateColClues,
  generateNonograma
} from '@galbahub/domain';

describe('Cálculo de pistas de Nonograma', () => {
  it('debe calcular las pistas de una línea de celdas correctamente', () => {
    // Caso 1: Línea vacía
    expect(calculateLineClues([false, false, false])).toEqual([0]);

    // Caso 2: Bloque único al inicio
    expect(calculateLineClues([true, true, false, false])).toEqual([2]);

    // Caso 3: Bloque único al final
    expect(calculateLineClues([false, false, true, true, true])).toEqual([3]);

    // Caso 4: Bloques múltiples separados por vacíos
    expect(calculateLineClues([true, false, true, true, false, true])).toEqual([1, 2, 1]);

    // Caso 5: Toda la línea pintada
    expect(calculateLineClues([true, true, true])).toEqual([3]);
  });

  it('debe calcular pistas de fila para una cuadrícula bidimensional', () => {
    const grid = [
      [true, false, true],
      [false, true, true],
      [false, false, false]
    ];
    const rowClues = calculateRowClues(grid);
    expect(rowClues).toEqual([
      [1, 1],
      [2],
      [0]
    ]);
  });

  it('debe calcular pistas de columna para una cuadrícula bidimensional', () => {
    const grid = [
      [true, false, true],
      [false, true, true],
      [false, false, false]
    ];
    const colClues = calculateColClues(grid);
    expect(colClues).toEqual([
      [1],
      [1],
      [2]
    ]);
  });
});

describe('Generador de Nonograma', () => {
  it('debe generar un juego de Nonograma con las dimensiones solicitadas', () => {
    const size = 5;
    const game = generateNonograma(size, 'easy');

    expect(game.grid.length).toBe(size);
    expect(game.grid[0].length).toBe(size);
    expect(game.rowClues.length).toBe(size);
    expect(game.colClues.length).toBe(size);
  });

  it('debe asegurar que el tablero no esté totalmente vacío', () => {
    const size = 5;
    const game = generateNonograma(size, 'hard');

    // Debe haber al menos una casilla pintada (true)
    const hasPaintedCell = game.grid.some(row => row.some(cell => cell));
    expect(hasPaintedCell).toBe(true);
  });
});
