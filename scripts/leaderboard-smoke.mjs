import assert from 'node:assert/strict';
import {
    createLeaderboardSession,
    createMemoryStorage,
    listLeaderboard,
    submitLeaderboardScore
} from '../netlify/functions/_shared/leaderboard-db.mjs';

const storage = createMemoryStorage();
const client = {
    ip: '127.0.0.1',
    userAgent: 'leaderboard-smoke'
};
const secret = 'smoke-secret';

const session = await createLeaderboardSession({
    storage,
    mode: 'hard',
    client,
    now: 1_000_000,
    secret
});

assert.equal(session.ok, true);
assert.ok(session.token);

const accepted = await submitLeaderboardScore({
    storage,
    client,
    secret,
    now: 1_012_000,
    payload: {
        playerName: 'Athena',
        mode: 'hard',
        distancePx: 5_000,
        distanceM: 500,
        durationMs: 10_000,
        clientRunId: 'smoke-valid-run',
        sessionToken: session.token
    }
});

assert.equal(accepted.ok, true);
assert.equal(accepted.accepted, true);
assert.equal(accepted.rank, 1);

const ranking = await listLeaderboard({
    storage,
    mode: 'hard',
    now: 1_013_000
});

assert.equal(ranking.entries.length, 1);
assert.equal(ranking.entries[0].playerName, 'Athena');
assert.equal(ranking.entries[0].distanceM, 500);

const cheatSession = await createLeaderboardSession({
    storage,
    mode: 'hard',
    client,
    now: 1_020_000,
    secret
});

const rejected = await submitLeaderboardScore({
    storage,
    client,
    secret,
    now: 1_021_000,
    payload: {
        playerName: 'Too Fast',
        mode: 'hard',
        distancePx: 200_000,
        distanceM: 20_000,
        durationMs: 100,
        clientRunId: 'smoke-cheat-run',
        sessionToken: cheatSession.token
    }
});

assert.equal(rejected.ok, true);
assert.equal(rejected.accepted, false);
assert.ok(rejected.flags.includes('impossible_velocity'));

console.log('leaderboard smoke passed');
