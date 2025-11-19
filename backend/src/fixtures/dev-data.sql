-- Development data fixtures for the flash card application

-- Insert sample users
INSERT INTO Users (username, email, hash, salt, pic_id, description, is_admin) VALUES
('devuser1', 'dev1@example.com', 'c297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb728', '73616c747573657231', 1, 'Developer user 1', 0),
('devuser2', 'dev2@example.com', 'd297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb729', '73616c747573657232', 2, 'Developer user 2', 0),
('adminuser', 'admin@example.com', 'a297e57206c7aee60fe2ede4bee13021542d0d472fa690c76557cdccf8610cc6cc63ff0d6f6a2f6433c577c5326d3023aabdedd04e453b43bfe1fd1ccc9cb72a', '73616c7461646d696e', 3, 'Admin user', 1);

-- Insert sample sets
INSERT INTO Sets (id, rowid_int, owner, title) VALUES
('1111111111111111', 1229782938247303441, 'devuser1', 'JavaScript Fundamentals'),
('2222222222222222', 2459565876494606882, 'devuser1', 'React Concepts'),
('3333333333333333', 3689348814741910323, 'devuser2', 'TypeScript Basics'),
('4444444444444444', 4919131752989213764, 'devuser2', 'Algorithms'),
('5555555555555555', 6148914691236517205, 'adminuser', 'Database Design');

-- Insert sample cards
INSERT INTO Cards (id, rowid_int, set_id, front, back) VALUES
-- JavaScript Fundamentals set
('1000000000000001', 1152921504606846977, '1111111111111111', 'What is a closure in JavaScript?', 'A closure is the combination of a function bundled together with references to its surrounding state.'),
('1000000000000002', 1152921504606846978, '1111111111111111', 'What is hoisting in JavaScript?', 'Hoisting is JavaScript''s default behavior of moving declarations to the top of their scope.'),
('1000000000000003', 1152921504606846979, '1111111111111111', 'What is the difference between let, const, and var?', 'var is function-scoped, let and const are block-scoped const cannot be reassigned.'),
-- React Concepts set
('2000000000000001', 2305843009213693953, '2222222222222222', 'What is JSX?', 'JSX is a syntax extension for JavaScript that looks similar to HTML.'),
('2000000000000002', 2305843009213693954, '2222222222222222', 'What are React hooks?', 'React Hooks are functions that let you "hook into" React state and lifecycle features from function components.'),
('2000000000000003', 2305843009213693955, '2222222222222222', 'What is the virtual DOM?', 'The virtual DOM is a programming concept where a virtual representation of the real DOM is kept in memory.'),
-- TypeScript Basics set
('3000000000000001', 3458764513820540931, '3333333333333333', 'What is TypeScript?', 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.'),
('3000000000000002', 3458764513820540932, '3333333333333333', 'What are interfaces in TypeScript?', 'Interfaces are a way to define contracts for object shapes in TypeScript.'),
('3000000000000003', 3458764513820540933, '3333333333333333', 'What is a generic in TypeScript?', 'A generic is a way to create reusable components that work with a variety of types.'),
-- Algorithms set
('4000000000000001', 4611686018427387905, '4444444444444444', 'What is Big O notation?', 'Big O notation is used to classify algorithms according to how their run time or space requirements grow as the input size grows.'),
('4000000000000002', 4611686018427387906, '4444444444444444', 'What is a binary search?', 'Binary search is an algorithm that finds the position of a target value within a sorted array.'),
('4000000000000003', 4611686018427387907, '4444444444444444', 'What is recursion?', 'Recursion is a programming technique where a function calls itself to solve a problem.'),
-- Database Design set
('5000000000000001', 5764607523034234881, '5555555555555555', 'What is a primary key?', 'A primary key is a column or set of columns that uniquely identifies each row in a table.'),
('5000000000000002', 5764607523034234882, '5555555555555555', 'What is a foreign key?', 'A foreign key is a column or set of columns in a table that references the primary key of another table.'),
('5000000000000003', 5764607523034234883, '5555555555555555', 'What is normalization?', 'Normalization is the process of organizing data to reduce redundancy and improve data integrity.');

-- Insert sample sessions
INSERT INTO Sessions (token, username, expires) VALUES
('dev_session_1', 'devuser1', strftime('%s', 'now') + 86400), -- 1 day from now
('dev_session_2', 'devuser2', strftime('%s', 'now') + 86400), -- 1 day from now
('dev_session_admin', 'adminuser', strftime('%s', 'now') + 86400); -- 1 day from now

-- Insert sample tracked sets
INSERT INTO TrackedSets (username, set_id) VALUES
('devuser1', '3333333333333333'), -- devuser1 tracking TypeScript Basics
('devuser2', '1111111111111111'), -- devuser2 tracking JavaScript Fundamentals
('devuser2', '2222222222222222'); -- devuser2 tracking React Concepts

-- Insert sample card progress
INSERT INTO CardProgress (username, card_id, points, last_reviewed) VALUES
('devuser1', '1000000000000001', 5, strftime('%s', 'now') - 3600), -- reviewed 1 hour ago
('devuser1', '1000000000000002', 3, strftime('%s', 'now') - 7200), -- reviewed 2 hours ago
('devuser2', '2000000000000001', 4, strftime('%s', 'now') - 10800); -- reviewed 3 hours ago


-- Insert sample FTS data for Cards (rebuild after all cards are inserted)
-- INSERT INTO CardsFTS(CardsFTS) VALUES('rebuild');

-- Insert sample FTS data for Sets (rebuild after all sets are inserted)
-- INSERT INTO SetsFTS(SetsFTS) VALUES('rebuild');

SELECT 1
