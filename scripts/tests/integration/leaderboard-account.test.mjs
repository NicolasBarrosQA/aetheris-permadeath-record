import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createAccount,
    createLeaderboardSession,
    createMemoryStorage,
    listLeaderboard,
    submitLeaderboardScore
} from '../../../netlify/functions/_shared/leaderboard-db.mjs';

const client = { ip: '127.0.0.1', userAgent: 'integration' };
const secret = 'integration-secret';

test('ranking aceita convidado e conta, usando callsign da conta quando autenticado', async () => {
    const storage = createMemoryStorage();

    const account = await createAccount({
        storage,
        username: 'athenaqa',
        displayName: 'Athena QA',
        password: 'SenhaForte123',
        client,
        secret,
        now: 10_000
    });
    assert.equal(account.ok, true);

    const guestSession = await createLeaderboardSession({ storage, mode: 'medium', client, secret, now: 20_000 });
    const guestScore = await submitLeaderboardScore({
        storage,
        payload: {
            playerName: 'Guest Name',
            mode: 'medium',
            distancePx: 1000,
            distanceM: 100,
            durationMs: 5000,
            clientRunId: 'guest-run',
            sessionToken: guestSession.token
        },
        client,
        secret,
        now: 26_000
    });
    assert.equal(guestScore.accepted, true);

    const accountSession = await createLeaderboardSession({ storage, mode: 'medium', client, secret, now: 30_000 });
    const accountScore = await submitLeaderboardScore({
        storage,
        account: account.account,
        payload: {
            playerName: 'Tampered Name',
            mode: 'medium',
            distancePx: 2000,
            distanceM: 200,
            durationMs: 6000,
            clientRunId: 'account-run',
            sessionToken: accountSession.token
        },
        client,
        secret,
        now: 37_000
    });
    assert.equal(accountScore.accepted, true);

    const ranking = await listLeaderboard({ storage, mode: 'medium', now: 38_000 });
    assert.equal(ranking.entries.length, 2);
    assert.equal(ranking.entries[0].playerName, 'Athena QA');
    assert.equal(ranking.entries[1].playerName, 'Guest Name');
});
