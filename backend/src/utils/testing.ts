import { Database } from "@db/sqlite";
import { genSalt, pbkdf2 } from "./hashing.ts";
import { Snowflake } from "./snowflake.ts";
import { generateSessionToken } from "./sessionkey.ts";

export function createSmallUniqueLabeled<T>(
  wrapper: (i: number) => T,
): () => T {
  return (function (this: { i: number }) {
    return wrapper(this.i++);
  }).bind({ i: 0 });
}

const usernameWrapper = (x: number) => `user${x}`;
export const createUsername = createSmallUniqueLabeled(
  usernameWrapper,
);

const passwordWrapper = (x: number) => `password${x}`;
export const createPassword = createSmallUniqueLabeled(
  passwordWrapper,
);

export async function createUser(
  db: Database,
  username = createUsername(),
  password = createPassword(),
  email = `${username}@mail.com`,
  salt = genSalt(),
) {
  const hash = await pbkdf2(
    password,
    salt,
  );
  db.sql`
    INSERT INTO Users (username, email, hash, salt) VALUES (
      ${username},
      ${email},
      ${hash},
      ${salt}
    )
  `;

  return {
    username,
    email,
    password,
    salt,
    hash,
  };
}

export function createExpiration(
  offset = 60 * 60 * 24,
  base = Date.now() * 0.001,
) {
  return base + offset;
}

export function createPreviousTime(
  offset = 60 * 60 * 24,
  base = Date.now() * 0.001,
) {
  return base - offset;
}

export async function createSession(
  db: Database,
  user?: { username: string },
  expires = createExpiration(),
  token = generateSessionToken(),
) {
  user = user ?? await createUser(db);

  db.sql`
    INSERT INTO Sessions (username, token, expires) VALUES (
      ${user.username},
      ${token},
      ${expires}
    )
  `;

  return {
    token,
    expires,
    user,
  };
}

const setNameWrapper = (x: number) => `Set (${x})`;
export const createSetName = createSmallUniqueLabeled(setNameWrapper);

export async function createSet(
  db: Database,
  owner?: { username: string },
  title = createSetName(),
  id = Snowflake.generate(),
) {
  owner = owner ?? await createUser(db);

  db.sql`
    INSERT INTO Sets (id, rowid_int, owner, title) VALUES (
      ${id},
      ${BigInt("0x" + id)},
      ${owner.username},
      ${title}
    )
  `;

  return {
    id,
    title,
    owner,
  };
}

const frontWrapper = (x: number) => `Card Front (${x})`;
export const createFront = createSmallUniqueLabeled(frontWrapper);

const backWrapper = (x: number) => `Card Back (${x})`;
export const createBack = createSmallUniqueLabeled(backWrapper);

export async function createCard(
  db: Database,
  set?: { id: string },
  front = createFront(),
  back = createBack(),
  id = Snowflake.generate(),
) {
  set = set ?? await createSet(db, await createUser(db));

  db.sql`
    INSERT INTO Cards (id, rowid_int, set_id, front, back) VALUES (
      ${id},
      ${BigInt("0x" + id)},
      ${set.id},
      ${front},
      ${back}
    )
  `;

  return {
    id,
    front,
    back,
    set,
  };
}

export async function createTracking(
  db: Database,
  user?: { username: string },
  set?: { id: string },
) {
  user = user ?? await createUser(db);
  set = set ?? await createSet(db, user);

  db.sql`
    INSERT INTO TrackedSets (username, set_id) VALUES (
      ${user.username},
      ${set.id}
    )
  `;

  return {
    user,
    set,
  };
}

export async function createCardProgress(
  db: Database,
  user?: { username: string },
  card?: { id: string },
  points = 0,
  studyTime = createPreviousTime(),
) {
  user = user ?? await createUser(db);
  card = card ?? await createCard(db, await createSet(db, user));

  db.sql`
    INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES (
      ${user.username},
      ${card.id},
      ${points},
      ${studyTime}
    )
  `;

  return {
    user,
    card,
    points,
    studyTime,
  };
}
