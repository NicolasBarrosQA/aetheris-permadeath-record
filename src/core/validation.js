/*
 * Validacoes leves de configuracao para falhar cedo quando um ajuste
 * invalido entra no projeto.
 */

import { BALANCE, BOOST_TYPES, DIFFICULTY_MODES, PHYS, SKINS_DB } from '../config.js';

function assertFiniteNumber(value, label) {
    if (!Number.isFinite(value)) {
        throw new Error(`Valor invalido em ${label}: ${value}`);
    }
}

function validatePhysics() {
    Object.entries(PHYS).forEach(([key, value]) => {
        assertFiniteNumber(value, `PHYS.${key}`);
    });
}

function validateBalance() {
    const difficulty = BALANCE.difficulty;
    const speed = BALANCE.speed;
    const virus = BALANCE.virus;

    Object.entries(difficulty).forEach(([key, value]) => {
        assertFiniteNumber(value, `BALANCE.difficulty.${key}`);
    });

    Object.entries(speed).forEach(([key, value]) => {
        assertFiniteNumber(value, `BALANCE.speed.${key}`);
    });

    Object.entries(virus).forEach(([key, value]) => {
        assertFiniteNumber(value, `BALANCE.virus.${key}`);
    });
}

function validateModes() {
    Object.entries(DIFFICULTY_MODES).forEach(([key, mode]) => {
        if (mode.id !== key) {
            throw new Error(`Modo invalido em DIFFICULTY_MODES.${key}: id inconsistente.`);
        }
    });

    Object.entries(BOOST_TYPES).forEach(([key, boost]) => {
        if (boost.id !== key) {
            throw new Error(`Boost invalido em BOOST_TYPES.${key}: id inconsistente.`);
        }
        assertFiniteNumber(boost.duration, `BOOST_TYPES.${key}.duration`);
    });
}

function validateSkins() {
    const seenIds = new Set();

    SKINS_DB.forEach((skin, index) => {
        if (!Number.isInteger(skin.id)) {
            throw new Error(`Skin invalida em SKINS_DB[${index}]: id precisa ser inteiro.`);
        }

        if (seenIds.has(skin.id)) {
            throw new Error(`ID de skin duplicado: ${skin.id}`);
        }

        if (typeof skin.name !== 'string' || skin.name.trim() === '') {
            throw new Error(`Skin invalida em SKINS_DB[${index}]: nome obrigatorio.`);
        }

        assertFiniteNumber(skin.cost, `SKINS_DB[${index}].cost`);

        if (skin.cost < 0) {
            throw new Error(`Skin invalida em SKINS_DB[${index}]: custo negativo.`);
        }

        seenIds.add(skin.id);
    });
}

export function validateGameConfig() {
    validatePhysics();
    validateBalance();
    validateModes();
    validateSkins();
}
