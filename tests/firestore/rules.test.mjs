import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, updateDoc, deleteDoc, deleteField, serverTimestamp, Timestamp, arrayUnion, runTransaction } from 'firebase/firestore';

const ADMIN_UID = 'qIxfD3Xeu7SvKGb9zf6APMhpFow2';
const PROJECT = 'demo-mural-rules';
const original = {
  nome: 'Pessoa', cidade: 'Manaus', texto: 'Pedido de teste', cor: '#fff9c4', pinClass: 'pin1-azul',
  intercessores: ['Ana', 'Ana'], intercessorIds: ['old-1', 'old-2'], oracoes: 2,
  createdAt: Timestamp.fromDate(new Date('2026-10-01T12:00:00Z')),
};
let env;
let visitor;
let admin;
let otherUser;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: {
      host: '127.0.0.1', port: 8088,
      rules: await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8'),
    },
  });
  visitor = env.unauthenticatedContext().firestore();
  admin = env.authenticatedContext(ADMIN_UID).firestore();
  otherUser = env.authenticatedContext('not-an-admin').firestore();
});
after(async () => env?.cleanup());

async function seed(data = original) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'pedidos/base'), data);
    await setDoc(doc(context.firestore(), 'updates/legacy'), { message: 'Legacy private message' });
  });
}
beforeEach(async () => { await env.clearFirestore(); await seed(); });

function creation(overrides = {}) {
  return { nome: '', cidade: '', texto: 'Um novo pedido', cor: '#fff9c4', pinClass: '',
    intercessores: [], intercessorIds: [], oracoes: 0, createdAt: serverTimestamp(), ...overrides };
}
function prayer(overrides = {}) {
  return { intercessores: [...original.intercessores, 'Ana'],
    intercessorIds: arrayUnion('new-id'), oracoes: 3, ...overrides };
}

test('public read and ordered month/all queries succeed', async () => {
  await assertSucceeds(getDoc(doc(visitor, 'pedidos/base')));
  await assertSucceeds(getDocs(query(collection(visitor, 'pedidos'), orderBy('createdAt', 'desc'))));
  await assertSucceeds(getDocs(query(collection(visitor, 'pedidos'), where('createdAt', '>=', Timestamp.fromDate(new Date('2026-10-01'))), where('createdAt', '<', Timestamp.fromDate(new Date('2026-11-01'))), orderBy('createdAt', 'desc'))));
});
test('create using the exact public form payload', async () => {
  await assertSucceeds(setDoc(doc(visitor, 'pedidos/new'), creation()));
});
test('600 character multiline request and supported pin formats succeed', async () => {
  for (const pinClass of ['', 'pin1', 'pin2', 'pin1-vermelho', 'pin2-verde']) {
    await assertSucceeds(setDoc(doc(visitor, `pedidos/pin-${pinClass || 'empty'}`), creation({ pinClass, texto: 'a\n' + 'b'.repeat(598) })));
  }
});

for (const [label, changes] of [
  ['preloaded names', { intercessores: ['Fake'] }],
  ['preloaded identifiers', { intercessorIds: ['Fake'] }],
  ['nonzero count', { oracoes: 10 }],
  ['noninteger count', { oracoes: 0.5 }],
  ['long text', { texto: 'a'.repeat(601) }],
  ['empty text', { texto: '' }],
  ['whitespace text', { texto: ' \n\t ' }],
  ['nonstring text', { texto: 123 }],
  ['long name', { nome: 'a'.repeat(201) }],
  ['long city', { cidade: 'a'.repeat(201) }],
  ['invalid color', { cor: 'url(https://example.com)' }],
  ['invalid pin', { pinClass: 'a b' }],
  ['forged date', { createdAt: original.createdAt }],
  ['finalized status', { status: 'finalizado' }],
  ['null status', { status: null }],
  ['finalization metadata', { attendedAt: serverTimestamp() }],
  ['legacy testimony field', { testemunho: 'extra' }],
  ['unexpected field', { admin: true }],
]) {
  test(`creation denies ${label}`, async () => assertFails(setDoc(doc(visitor, 'pedidos/new'), creation(changes))));
}
test('creation denies missing required timestamp', async () => {
  const data = creation(); delete data.createdAt;
  await assertFails(setDoc(doc(visitor, 'pedidos/new'), data));
});

test('transaction preserves duplicate names and arrayUnion identifier', async () => {
  const ref = doc(visitor, 'pedidos/base');
  await assertSucceeds(runTransaction(visitor, async (transaction) => {
    const snap = await transaction.get(ref);
    transaction.update(ref, { intercessores: [...snap.data().intercessores, 'Ana'], intercessorIds: arrayUnion('new-id'), oracoes: snap.data().oracoes + 1 });
  }));
});
for (const [label, changes] of [
  ['erase history', { intercessores: [], intercessorIds: [], oracoes: 0 }],
  ['replace old name', { intercessores: ['Changed', 'Ana', 'Ana'] }],
  ['reorder old IDs', { intercessorIds: ['old-2', 'old-1', 'new-id'] }],
  ['reuse local identifier', { intercessorIds: ['old-1', 'old-2', 'old-1'] }],
  ['add two at once', { intercessores: ['Ana', 'Ana', 'A', 'B'], intercessorIds: ['old-1', 'old-2', 'new-a', 'new-b'], oracoes: 4 }],
  ['missing identifier', { intercessorIds: ['old-1', 'old-2'] }],
  ['count jump', { oracoes: 999 }],
  ['wrong count type', { oracoes: '3' }],
  ['nonstring name', { intercessores: ['Ana', 'Ana', 123] }],
  ['long name', { intercessores: ['Ana', 'Ana', 'a'.repeat(201)] }],
  ['blank name', { intercessores: ['Ana', 'Ana', ' \n '] }],
  ['long identifier', { intercessorIds: ['old-1', 'old-2', 'a'.repeat(201)] }],
  ['changed text', { texto: 'Replaced' }],
  ['changed city', { cidade: 'Changed' }],
  ['added status field', { status: 'finalizado' }],
  ['added unknown field', { privileged: true }],
  ['removed createdAt', { createdAt: deleteField() }],
  ['removed nome', { nome: deleteField() }],
]) {
  test(`prayer denies ${label}`, async () => assertFails(updateDoc(doc(visitor, 'pedidos/base'), prayer(changes))));
}
test('finalized request denies public prayer', async () => {
  await seed({ ...original, status: 'finalizado' });
  await assertFails(updateDoc(doc(visitor, 'pedidos/base'), prayer()));
});
test('legacy deduplicated names keep old counter and history', async () => {
  await seed({ ...original, intercessores: ['Ana'] });
  await assertSucceeds(updateDoc(doc(visitor, 'pedidos/base'), prayer({ intercessores: ['Ana', 'Ana'] })));
});
test('legacy missing count uses current client fallback', async () => {
  const data = { ...original, intercessores: ['Ana'] }; delete data.oracoes;
  await seed(data);
  await assertSucceeds(updateDoc(doc(visitor, 'pedidos/base'), prayer({ intercessores: ['Ana', 'Ana'] })));
});
test('legacy optional data remains untouched by prayer', async () => {
  await seed({ ...original, status: null, testemunho: 'Old content' });
  await assertSucceeds(updateDoc(doc(visitor, 'pedidos/base'), prayer()));
});
test('admin edits name, city and 2000 character text together', async () => {
  await assertSucceeds(updateDoc(doc(admin, 'pedidos/base'), { nome: 'Updated', cidade: 'Other city', texto: 'a'.repeat(2000) }));
});
test('admin can edit finalized requests', async () => {
  await seed({ ...original, status: 'finalizado' });
  await assertSucceeds(updateDoc(doc(admin, 'pedidos/base'), { nome: 'Updated', cidade: '', texto: 'Updated request' }));
});
test('admin cannot smuggle new fields while editing', async () => {
  await assertFails(updateDoc(doc(admin, 'pedidos/base'), { texto: 'Updated', privileged: true }));
  await assertFails(updateDoc(doc(admin, 'pedidos/base'), { nome: deleteField() }));
  await assertFails(updateDoc(doc(admin, 'pedidos/base'), { texto: 'a'.repeat(2001) }));
});
test('admin finalization uses server timestamp', async () => {
  await assertSucceeds(updateDoc(doc(admin, 'pedidos/base'), { status: 'finalizado', attendedAt: serverTimestamp() }));
});
test('admin cannot finalize with a forged timestamp', async () => {
  await assertFails(updateDoc(doc(admin, 'pedidos/base'), { status: 'finalizado', attendedAt: original.createdAt }));
});
test('nonadmin account and visitor cannot edit, finalize or delete', async () => {
  for (const db of [visitor, otherUser]) {
    await assertFails(updateDoc(doc(db, 'pedidos/base'), { nome: 'Changed', cidade: '', texto: 'Changed' }));
    await assertFails(updateDoc(doc(db, 'pedidos/base'), { status: 'finalizado', attendedAt: serverTimestamp() }));
    await assertFails(deleteDoc(doc(db, 'pedidos/base')));
  }
});
test('admin deletes a request', async () => assertSucceeds(deleteDoc(doc(admin, 'pedidos/base'))));
test('legacy updates are denied to every client, including admin', async () => {
  for (const db of [visitor, admin, otherUser]) {
    await assertFails(getDoc(doc(db, 'updates/legacy')));
    await assertFails(getDocs(collection(db, 'updates')));
    await assertFails(setDoc(doc(db, 'updates/new'), { status: 'pending', message: 'No longer supported' }));
    await assertFails(updateDoc(doc(db, 'updates/legacy'), { status: 'reviewed' }));
    await assertFails(deleteDoc(doc(db, 'updates/legacy')));
  }
});
test('unmatched collections and subcollections are denied', async () => {
  await assertFails(setDoc(doc(visitor, 'other/data'), { value: true }));
  await assertFails(setDoc(doc(admin, 'pedidos/base/private/data'), { value: true }));
});
