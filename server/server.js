import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import maaRoutes from './routes/maa.js';
import notificationRoutes from './routes/notification.js';
import { setSocketIO } from './services/schedulerService.js';
import { networkInterfaces } from 'os';
import { printPathConfig } from './config/paths.js';

const app = express();
const httpServer = createServer(app);

// 获取本机 IP 地址
const getLocalIpAddress = () => {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // 跳过内部地址和非 IPv4 地址
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIpAddress();

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// 生产环境：服务前端静态文件
if (process.env.NODE_ENV === 'production') {
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const clientDistPath = join(__dirname, '..', 'client', 'dist');
  
  app.use(express.static(clientDistPath));
  
  // 所有非 API 路由都返回 index.html（支持前端路由）
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(join(clientDistPath, 'index.html'));
  });
}

// API 路由
app.use('/api/maa', maaRoutes);
app.use('/api/notification', notificationRoutes);

// WebSocket 连接
io.on('connection', (socket) => {
  console.log('客户端已连接');
  
  socket.on('disconnect', () => {
    console.log('客户端已断开');
  });
});

// 设置 Socket.io 到 schedulerService
setSocketIO(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在:`);
  console.log(`  - 本地: http://localhost:${PORT}`);
  console.log(`  - 网络: http://${localIp}:${PORT}`);
  console.log('');
  printPathConfig();
});

export { io };

