CREATE TABLE IF NOT EXISTS vaults (
  filename TEXT PRIMARY KEY,
  ciphertext BLOB NOT NULL,
  updated_at INTEGER NOT NULL
);
