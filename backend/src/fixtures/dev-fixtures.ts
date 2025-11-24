import { Database } from "@db/sqlite";
import {
  createCard,
  createCardProgress,
  createExpiration,
  createSession,
  createSet,
  createTracking,
  createUser,
} from "../utils/testing.ts";

/**
 * Loads development fixtures data into the database using TypeScript functions
 */
export async function loadDevFixturesData(db: Database) {
  // Create sample users
  const devuser1 = await createUser(
    db,
    "devuser1",
    "password1",
    "Developer user 1",
    1,
    false,
    "dev1@example.com",
  );

  const devuser2 = await createUser(
    db,
    "devuser2",
    "password2",
    "Developer user 2",
    2,
    false,
    "dev2@example.com",
  );

  const adminuser = await createUser(
    db,
    "adminuser",
    "password3",
    "Admin user",
    3,
    true,
    "admin@example.com",
  );

  // Create sample sets owned by different users
  const jsFundamentalsSet = await createSet(
    db,
    devuser1,
    "JavaScript Fundamentals",
  );
  const reactConceptsSet = await createSet(db, devuser1, "React Concepts");
  const tsBasicsSet = await createSet(db, devuser2, "TypeScript Basics");
  const algorithmsSet = await createSet(db, devuser2, "Algorithms");
  const dbDesignSet = await createSet(db, adminuser, "Database Design");

  // Add cards to JavaScript Fundamentals set
  const jsClosureCard = await createCard(
    db,
    jsFundamentalsSet,
    "What is a closure in JavaScript?",
    "A closure is the combination of a function bundled together with references to its surrounding state.",
  );

  const jsHoistingCard = await createCard(
    db,
    jsFundamentalsSet,
    "What is hoisting in JavaScript?",
    "Hoisting is JavaScript's default behavior of moving declarations to the top of their scope.",
  );

  const _jsScopeCard = await createCard(
    db,
    jsFundamentalsSet,
    "What is the difference between let, const, and var?",
    "var is function-scoped, let and const are block-scoped const cannot be reassigned.",
  );

  // Add cards to React Concepts set
  const jsxCard = await createCard(
    db,
    reactConceptsSet,
    "What is JSX?",
    "JSX is a syntax extension for JavaScript that looks similar to HTML.",
  );

  const _hooksCard = await createCard(
    db,
    reactConceptsSet,
    "What are React hooks?",
    'React Hooks are functions that let you "hook into" React state and lifecycle features from function components.',
  );

  const _virtualDOMCard = await createCard(
    db,
    reactConceptsSet,
    "What is the virtual DOM?",
    "The virtual DOM is a programming concept where a virtual representation of the real DOM is kept in memory.",
  );

  // _Add cards to TypeScript Basics set
  const _tsCard = await createCard(
    db,
    tsBasicsSet,
    "What is TypeScript?",
    "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
  );

  const _interfacesCard = await createCard(
    db,
    tsBasicsSet,
    "What are interfaces in TypeScript?",
    "Interfaces are a way to define contracts for object shapes in TypeScript.",
  );

  const _genericsCard = await createCard(
    db,
    tsBasicsSet,
    "What is a generic in TypeScript?",
    "A generic is a way to create reusable components that work with a variety of types.",
  );

  // _Add cards to Algorithms set
  const _bigOCard = await createCard(
    db,
    algorithmsSet,
    "What is Big O notation?",
    "Big O notation is used to classify algorithms according to how their run time or space requirements grow as the input size grows.",
  );

  const _binarySearchCard = await createCard(
    db,
    algorithmsSet,
    "What is a binary search?",
    "Binary search is an algorithm that finds the position of a target value within a sorted array.",
  );

  const _recursionCard = await createCard(
    db,
    algorithmsSet,
    "What is recursion?",
    "Recursion is a programming technique where a function calls itself to solve a problem.",
  );

  // Add cards to Database Design set
  const _primaryKeyCard = await createCard(
    db,
    dbDesignSet,
    "What is a primary key?",
    "A primary key is a column or set of columns that uniquely identifies each row in a table.",
  );

  const _foreignKeyCard = await createCard(
    db,
    dbDesignSet,
    "What is a foreign key?",
    "A foreign key is a column or set of columns in a table that references the primary key of another table.",
  );

  const _normalizationCard = await createCard(
    db,
    dbDesignSet,
    "What is normalization?",
    "Normalization is the process of organizing data to reduce redundancy and improve data integrity.",
  );

  // Create sessions for users
  await createSession(db, devuser1, createExpiration());
  await createSession(db, devuser2, createExpiration());
  await createSession(db, adminuser, createExpiration());

  // Create tracked sets
  await createTracking(db, devuser1, tsBasicsSet); // devuser1 tracking TypeScript Basics
  await createTracking(db, devuser2, jsFundamentalsSet); // devuser2 tracking JavaScript Fundamentals
  await createTracking(db, devuser2, reactConceptsSet); // devuser2 tracking React Concepts

  // Create card progress data
  const oneHourAgo = Date.now() / 1000 - 3600; // 1 hour ago
  const twoHoursAgo = Date.now() / 1000 - 7200; // 2 hours ago
  const threeHoursAgo = Date.now() / 1000 - 10800; // 3 hours ago

  await createCardProgress(db, devuser1, jsClosureCard, 5, oneHourAgo); // reviewed 1 hour ago
  await createCardProgress(db, devuser1, jsHoistingCard, 3, twoHoursAgo); // reviewed 2 hours ago
  await createCardProgress(db, devuser2, jsxCard, 4, threeHoursAgo); // reviewed 3 hours ago
}
