-- Drop tables in correct order to avoid foreign key conflicts
DROP TABLE IF EXISTS LEVEL_PROGRESS;
DROP TABLE IF EXISTS USERS;

-- Create USERS table
CREATE TABLE USERS (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  first_time_play INTEGER NOT NULL DEFAULT 1
);

-- Create LEVEL_PROGRESS table
CREATE TABLE LEVEL_PROGRESS (
  user_id INTEGER NOT NULL,
  level_id TEXT NOT NULL,
  stars_collected INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, level_id),
  FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);
