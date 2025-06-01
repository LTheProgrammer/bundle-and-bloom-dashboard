import express from 'express';
import cors from 'cors';
import routes from './routes/routes.js'
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", routes);
// Ex: GET /api/users
/*app.get("/api/users", (req, res) => {
    const data = fs.readFileSync("./data/users.json", "utf-8");
    res.json(JSON.parse(data));
});*/

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
});
