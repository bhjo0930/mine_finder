import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket/socketHandler';
import { rankingRepository } from './db/rankingRepository';

const app = express();
app.use(cors());
app.use(express.json());

const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // 앱(WebView 포함) 등 origin 헤더가 없을 수 있어 허용
      if (!origin) {
        callback(null, true);
        return;
      }

      // CLIENT_URL 미설정 시 개발 편의상 전체 허용
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST'],
  },
  // 지연 최소화 설정
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
});

async function bootstrap(): Promise<void> {
  await rankingRepository.init();
  setupSocketHandlers(io);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`Mine Finder Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap server', err);
  process.exit(1);
});

export { io };
