const bcrypt = require('bcryptjs');
const { getPool, getIsConnected } = require('../config/db');

// In-Memory User Store (Fallback when PostgreSQL service is offline)
const inMemoryUsers = [];

// Password Hashing Helper
const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainPassword, salt);
};

// Format SQL row to JS User Object
const formatUserRow = (row, includePassword = false) => {
  if (!row) return null;
  const user = {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone || '',
    avatar: row.avatar || '',
    bio: row.bio || '',
    resetPasswordToken: row.reset_password_token || undefined,
    resetPasswordExpire: row.reset_password_expire ? new Date(row.reset_password_expire).getTime() : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (includePassword) {
    user.password = row.password;
  }
  return user;
};

/**
 * Find User by Email (PostgreSQL / Memory Fallback)
 */
const findUserByEmail = async (email, includePassword = false) => {
  const lowerEmail = email.toLowerCase().trim();

  if (getIsConnected()) {
    const pool = getPool();
    const query = 'SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1';
    const result = await pool.query(query, [lowerEmail]);
    if (result.rows.length === 0) return null;
    return formatUserRow(result.rows[0], includePassword);
  }

  const user = inMemoryUsers.find((u) => u.email === lowerEmail);
  if (!user) return null;

  if (!includePassword) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
  return user;
};

/**
 * Find User by ID (PostgreSQL / Memory Fallback)
 */
const findUserById = async (id) => {
  if (getIsConnected()) {
    const pool = getPool();
    const query = 'SELECT * FROM users WHERE id = $1 LIMIT 1';
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return formatUserRow(result.rows[0], false);
  }

  const user = inMemoryUsers.find((u) => String(u._id) === String(id) || String(u.id) === String(id));
  if (!user) return null;
  const { password, ...sanitized } = user;
  return sanitized;
};

/**
 * Create New User (PostgreSQL / Memory Fallback)
 */
const createUser = async (userData) => {
  const { name, email, password, role = 'renter', phone = '', avatar = '', bio = '' } = userData;
  const lowerEmail = email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password);

  if (getIsConnected()) {
    const pool = getPool();
    const insertQuery = `
      INSERT INTO users (name, email, password, role, phone, avatar, bio, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    const values = [name, lowerEmail, hashedPassword, role, phone, avatar, bio];
    const result = await pool.query(insertQuery, values);
    return formatUserRow(result.rows[0], false);
  }

  const newUser = {
    _id: `mem_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    id: `mem_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    email: lowerEmail,
    password: hashedPassword,
    role,
    phone,
    avatar,
    bio,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  inMemoryUsers.push(newUser);
  const { password: _, ...sanitized } = newUser;
  return sanitized;
};

/**
 * Update User Record (PostgreSQL / Memory Fallback)
 */
const updateUser = async (id, updateFields) => {
  if (getIsConnected()) {
    const pool = getPool();

    // Prepare fields to update
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (updateFields.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updateFields.name);
    }
    if (updateFields.password !== undefined) {
      const hashed = await hashPassword(updateFields.password);
      setClauses.push(`password = $${paramIndex++}`);
      values.push(hashed);
    }
    if (updateFields.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(updateFields.phone);
    }
    if (updateFields.avatar !== undefined) {
      setClauses.push(`avatar = $${paramIndex++}`);
      values.push(updateFields.avatar);
    }
    if (updateFields.bio !== undefined) {
      setClauses.push(`bio = $${paramIndex++}`);
      values.push(updateFields.bio);
    }
    if (updateFields.resetPasswordToken !== undefined) {
      setClauses.push(`reset_password_token = $${paramIndex++}`);
      values.push(updateFields.resetPasswordToken);
    }
    if (updateFields.resetPasswordExpire !== undefined) {
      setClauses.push(`reset_password_expire = $${paramIndex++}`);
      values.push(updateFields.resetPasswordExpire ? new Date(updateFields.resetPasswordExpire) : null);
    }

    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) { // Only updated_at
      return findUserById(id);
    }

    values.push(id);
    const updateQuery = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) return null;
    return formatUserRow(result.rows[0], false);
  }

  const index = inMemoryUsers.findIndex((u) => String(u._id) === String(id) || String(u.id) === String(id));
  if (index === -1) return null;

  if (updateFields.password) {
    updateFields.password = await hashPassword(updateFields.password);
  }

  inMemoryUsers[index] = {
    ...inMemoryUsers[index],
    ...updateFields,
    updatedAt: new Date()
  };

  const { password: _, ...sanitized } = inMemoryUsers[index];
  return sanitized;
};

/**
 * Password Verification Helper
 */
const verifyPassword = async (user, enteredPassword) => {
  return await bcrypt.compare(enteredPassword, user.password);
};

/**
 * Find User by Password Reset Token
 */
const findUserByResetToken = async (hashedToken) => {
  if (getIsConnected()) {
    const pool = getPool();
    const query = `
      SELECT * FROM users
      WHERE reset_password_token = $1
      AND reset_password_expire > NOW()
      LIMIT 1
    `;
    const result = await pool.query(query, [hashedToken]);
    if (result.rows.length === 0) return null;
    return formatUserRow(result.rows[0], false);
  }

  return inMemoryUsers.find(
    (u) =>
      u.resetPasswordToken === hashedToken &&
      u.resetPasswordExpire &&
      u.resetPasswordExpire > Date.now()
  );
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  verifyPassword,
  findUserByResetToken
};
