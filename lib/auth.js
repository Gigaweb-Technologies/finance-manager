import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secret-key';

export const signToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

export const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};

export const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

export const authenticateToken = (req) => {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return null;

    return verifyToken(token);
};

/**
 * Returns the decoded JWT payload if the request is authenticated AND the user is admin.
 * Returns null otherwise.
 */
export const requireAdmin = (req) => {
    const payload = authenticateToken(req);
    if (!payload) return null;
    if (payload.role !== 'admin') return null;
    return payload;
};
