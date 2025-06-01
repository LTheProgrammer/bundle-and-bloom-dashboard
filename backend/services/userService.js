import fs from 'fs/promises';
import bcrypt from 'bcryptjs';
const USERS_PATH = './data/users.json';

class UserService {
    async authenticateUser(email, password) {
        const file = await fs.readFile(USERS_PATH, 'utf-8');
        const users = JSON.parse(file);

        const user = users.find(u => u.email === email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        return isValid ? user : null;
    }
}

export default new UserService();
