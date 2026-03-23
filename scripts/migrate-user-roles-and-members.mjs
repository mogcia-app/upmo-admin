import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

function getAdminConfig() {
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_KEY;

  if (!serviceAccountKey) {
    throw new Error(
      'FIREBASE_ADMIN_SDK_KEY environment variable is not set. Please add it before running this migration.',
    );
  }

  try {
    return {
      credential: cert(JSON.parse(serviceAccountKey)),
    };
  } catch {
    throw new Error('Failed to parse FIREBASE_ADMIN_SDK_KEY. Make sure it is valid JSON.');
  }
}

const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp(getAdminConfig());
const db = getFirestore(adminApp);

const args = new Set(process.argv.slice(2));
const shouldApply = args.has('--apply');
const shouldVerbose = args.has('--verbose');

function normalizeRole(role) {
  if (role === 'owner' || role === 'admin' || role === 'member') {
    return role;
  }

  if (role === 'user') {
    return 'member';
  }

  if (role === 'manager') {
    return 'admin';
  }

  return 'member';
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildMemberPayload({ uid, userData, companyId, role }) {
  const now = Timestamp.now();

  return {
    uid,
    email: userData.email ?? null,
    displayName: userData.displayName ?? userData.email ?? uid,
    companyId,
    role,
    status: userData.status ?? 'active',
    createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt : now,
    updatedAt: now,
  };
}

async function commitOperations(operations) {
  let batch = db.batch();
  let opCount = 0;
  let batchCount = 0;

  for (const operation of operations) {
    operation(batch);
    opCount += 1;

    if (opCount === 450) {
      await batch.commit();
      batchCount += 1;
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    batchCount += 1;
  }

  return batchCount;
}

async function main() {
  const [companiesSnapshot, usersSnapshot] = await Promise.all([
    db.collection('companies').get(),
    db.collection('users').get(),
  ]);

  const companiesById = new Map();
  const companyIdsByName = new Map();

  for (const doc of companiesSnapshot.docs) {
    const data = doc.data();
    const companyName = toTrimmedString(data.name);

    companiesById.set(doc.id, { id: doc.id, ...data });

    if (!companyName) {
      continue;
    }

    const existing = companyIdsByName.get(companyName) ?? [];
    existing.push(doc.id);
    companyIdsByName.set(companyName, existing);
  }

  const operations = [];
  const warnings = [];
  const summary = {
    scannedUsers: usersSnapshot.size,
    usersRoleUpdated: 0,
    usersCompanyIdUpdated: 0,
    membersEnsured: 0,
    unresolvedCompanyUsers: 0,
  };

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const rawRole = toTrimmedString(userData.role);
    const normalizedRole = normalizeRole(rawRole);
    const rawCompanyId = toTrimmedString(userData.companyId);
    const companyName = toTrimmedString(userData.companyName);

    let resolvedCompanyId = rawCompanyId;

    if (resolvedCompanyId && !companiesById.has(resolvedCompanyId)) {
      warnings.push(
        `[missing-company] ${userDoc.id}: companyId "${resolvedCompanyId}" does not exist in companies`,
      );
      resolvedCompanyId = '';
    }

    if (!resolvedCompanyId && companyName) {
      const matchingCompanyIds = companyIdsByName.get(companyName) ?? [];

      if (matchingCompanyIds.length === 1) {
        resolvedCompanyId = matchingCompanyIds[0];
      } else if (matchingCompanyIds.length > 1) {
        warnings.push(
          `[ambiguous-company] ${userDoc.id}: companyName "${companyName}" matched multiple companies`,
        );
      }
    }

    const userUpdates = {};

    if (rawRole !== normalizedRole) {
      userUpdates.role = normalizedRole;
      summary.usersRoleUpdated += 1;
    }

    if (resolvedCompanyId && rawCompanyId !== resolvedCompanyId) {
      userUpdates.companyId = resolvedCompanyId;
      summary.usersCompanyIdUpdated += 1;
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updatedAt = Timestamp.now();
      operations.push((batch) => batch.update(userDoc.ref, userUpdates));
    }

    if (!resolvedCompanyId) {
      summary.unresolvedCompanyUsers += 1;
      warnings.push(
        `[unresolved-company] ${userDoc.id}: unable to resolve companyId from companyId/companyName`,
      );
      continue;
    }

    const memberPayload = buildMemberPayload({
      uid: userDoc.id,
      userData,
      companyId: resolvedCompanyId,
      role: normalizedRole,
    });

    const memberRef = db
      .collection('organizations')
      .doc(resolvedCompanyId)
      .collection('members')
      .doc(userDoc.id);

    operations.push((batch) => batch.set(memberRef, memberPayload, { merge: true }));
    summary.membersEnsured += 1;

    if (shouldVerbose) {
      warnings.push(
        `[member-sync] ${userDoc.id}: ensured organizations/${resolvedCompanyId}/members/${userDoc.id}`,
      );
    }
  }

  console.log(`Mode: ${shouldApply ? 'apply' : 'dry-run'}`);
  console.log(JSON.stringify(summary, null, 2));

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (!shouldApply) {
    console.log('\nDry run only. Re-run with --apply to write changes.');
    return;
  }

  const batchCount = await commitOperations(operations);
  console.log(`\nApplied ${operations.length} write operations across ${batchCount} batch(es).`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
