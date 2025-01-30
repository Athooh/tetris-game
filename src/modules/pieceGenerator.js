import { TETROMINO_TYPES } from '../constants/gameConstants.js';

export function generateNextPiece() {
  return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
} 