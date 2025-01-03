import jwt from 'jsonwebtoken';

const JWT_SECRET = 'your-secret-key';

export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(403).json({ message: 'Нет токена' });
        }

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: 'Неудачная авторизация' });
            }
            if (!allowedRoles.includes(decoded.roleId)) {
                return res.status(403).json({ message: 'Нет доступа' });
            }

            req.user = decoded;
            next();
        });
    };
};