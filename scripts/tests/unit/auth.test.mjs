import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createAccount,
    createMemoryStorage,
    getAccountBySessionToken,
    loginAccount,
    logoutAccount,
    normalizeAccountName,
    normalizeUsername,
    validatePassword
} from '../../../netlify/functions/_shared/leaderboard-db.mjs';

const client = { ip: '127.0.0.1', userAgent: 'unit' };
const secret = 'unit-secret';

test('normaliza usuario e callsign sem caracteres perigosos', () => {
    assert.equal(normalizeUsername(' QA.Runner!! '), 'QARunner');
    assert.equal(normalizeAccountName('<script>Athena</script>'), 'scriptAthenascri');
});

test('valida politica minima de senha', () => {
    assert.equal(validatePassword('short1'), 'password_too_short');
    assert.equal(validatePassword('somenteletras'), 'password_needs_letter_and_number');
    assert.equal(validatePassword('SenhaForte123'), null);
});

test('cria, autentica e revoga sessao de conta', async () => {
    const storage = createMemoryStorage();
    const created = await createAccount({
        storage,
        username: 'qa-runner',
        displayName: 'QA Runner',
        password: 'SenhaForte123',
        client,
        secret,
        now: 1_000
    });

    assert.equal(created.ok, true);
    assert.equal(created.account.displayName, 'QA Runner');
    assert.ok(created.session.token);

    const current = await getAccountBySessionToken({
        storage,
        token: created.session.token,
        secret,
        now: 2_000
    });
    assert.equal(current.account.username, 'qa-runner');

    const badLogin = await loginAccount({
        storage,
        username: 'qa-runner',
        password: 'senhaerrada123',
        client,
        secret,
        now: 3_000
    });
    assert.equal(badLogin.ok, false);
    assert.equal(badLogin.error, 'invalid_credentials');

    const login = await loginAccount({
        storage,
        username: 'qa-runner',
        password: 'SenhaForte123',
        client,
        secret,
        now: 4_000
    });
    assert.equal(login.ok, true);
    assert.ok(login.session.token);

    await logoutAccount({
        storage,
        token: login.session.token,
        secret,
        now: 5_000
    });

    const afterLogout = await getAccountBySessionToken({
        storage,
        token: login.session.token,
        secret,
        now: 6_000
    });
    assert.equal(afterLogout.account, null);
});
