#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

function parseArgs(argv) {
  const result = {
    dryRun: false,
    orgId: null,
    uid: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dryRun') {
      result.dryRun = true;
      continue;
    }

    if (arg === '--orgId') {
      result.orgId = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--uid') {
      result.uid = argv[index + 1] || null;
      index += 1;
    }
  }

  return result;
}

function getAdminDb() {
  if (getApps().length > 0) {
    return getFirestore(getApps()[0]);
  }

  const rawKey = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!rawKey) {
    throw new Error('FIREBASE_ADMIN_SDK_KEY environment variable is not set.');
  }

  const serviceAccount = JSON.parse(rawKey);
  const app = initializeApp({
    credential: cert(serviceAccount),
  });

  return getFirestore(app);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = getAdminDb();

  let usersQuery = db.collection('users');
  if (options.uid) {
    usersQuery = usersQuery.where('__name__', '==', options.uid);
  }

  const usersSnapshot = await usersQuery.get();
  let mirroredCount = 0;
  let skippedCount = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data() || {};
    const resolvedOrgId = userData.companyId || userData.orgId || null;

    if (!resolvedOrgId) {
      skippedCount += 1;
      console.log(`[skip] user=${userDoc.id} reason=no-org-id`);
      continue;
    }

    if (options.orgId && options.orgId !== resolvedOrgId) {
      continue;
    }

    const documentsSnapshot = await userDoc.ref.collection('documents').get();

    for (const documentDoc of documentsSnapshot.docs) {
      const sourceData = documentDoc.data() || {};
      const targetRef = db
        .collection('organizations')
        .doc(resolvedOrgId)
        .collection('documents')
        .doc(documentDoc.id);
      const targetData = {
        ...sourceData,
        orgId: resolvedOrgId,
        documentId: documentDoc.id,
        ownerUid: userDoc.id,
        mirroredFromUserUid: userDoc.id,
        mirroredAt: Timestamp.now(),
      };

      if (options.dryRun) {
        console.log(`[dryRun] ${userDoc.id}/documents/${documentDoc.id} -> organizations/${resolvedOrgId}/documents/${documentDoc.id}`);
      } else {
        await targetRef.set(targetData, { merge: true });
        console.log(`[mirror] ${userDoc.id}/documents/${documentDoc.id} -> organizations/${resolvedOrgId}/documents/${documentDoc.id}`);
      }

      mirroredCount += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        orgId: options.orgId,
        uid: options.uid,
        mirroredCount,
        skippedCount,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
