import { verifyToken } from '../utils/jwt.js';

export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // { id, role, permissions, etc. }
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
}

// autoriser selon le rôle OU une permission explicite
export function authorize({ roles = [], permissions = [] }) {
    return (req, res, next) => {
        const user = req.user;

        if (!user) return res.status(401).json({ message: 'Non authentifié' });

        if (
            (roles.length && roles.includes(user.role)) ||
            (permissions.length && permissions.some(p => user.permissions?.includes(p)))
        ) {
            return next();
        }

        return res.status(403).json({ message: 'Accès refusé' });
    };
}
