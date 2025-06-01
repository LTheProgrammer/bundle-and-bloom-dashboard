import userService from '../services/userService.js';
import { signToken } from '../utils/jwt.js';

export async function login(req, res) {
    const { email, password } = req.body;
    const user = await userService.authenticateUser(email, password);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email, name: user.name, permissions: user.permissions });
    res.json({ token, user });
}
