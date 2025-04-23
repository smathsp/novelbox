const { createServer } = require('http');
const { promises: fs } = require('fs');
const path = require('path');

const server = createServer(async (req, res) => {
const isLocal = [
  '127.0.0.1',
  '::1',
  'localhost'
].some(addr => 
  req.headers.host?.startsWith(addr) || 
  req.socket.remoteAddress?.includes(addr)
);

if (isLocal) {
    // 设置跨域头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      
      if (req.method === 'GET' && url.pathname === '/list') {
        const dirPath = url.searchParams.get('path') || '.';
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files.map(dirent => ({
          name: dirent.name,
          type: dirent.isDirectory() ? 'directory' : 'file'
        }))));
      
      } else if (req.method === 'GET') {
        const filePath = url.searchParams.get('path') || '';
        const data = await fs.readFile(decodeURIComponent(filePath), 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(data);
      
      } else if (req.method === 'POST') {
        const filePath = url.searchParams.get('path') || '';
        const isBlob = req.headers['content-type']?.includes('application/octet-stream');
        const chunks = [];
        
        req.on('data', chunk => {
          if (isBlob) {
            chunks.push(chunk);
          } else {
            chunks.push(chunk.toString());
          }
        });
        
        req.on('end', async () => {
          const fullPath = decodeURIComponent(filePath);
          const dirPath = path.dirname(fullPath);
          
          try {
            try {
              const fileHandle = await fs.open(fullPath, 'r+');
              await fileHandle.close();
            } catch (error) {
              if (error.code === 'ENOENT') {
              } else if (error.code === 'EBUSY' || error.code === 'EPERM') {
                throw new Error(`文件被占用或没有写入权限: ${fullPath}`);
              } else {
                throw error;
              }
            }
            await fs.mkdir(dirPath, { recursive: true });
            
            if (isBlob) {
              const buffer = Buffer.concat(chunks);
              await fs.writeFile(fullPath, buffer);
            } else {
              await fs.writeFile(fullPath, chunks.join(''));
            }
            
            res.writeHead(201);
            res.end();
          } catch (error) {
            res.writeHead(423, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } else if (req.method === 'DELETE') {
        const filePath = url.searchParams.get('path') || '';
        await fs.unlink(decodeURIComponent(filePath));
        res.writeHead(204);
        res.end();

      } else {
        res.writeHead(404);
        res.end();
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  } else {
    console.log('非本地访问拒绝:', 
      `来源IP: ${req.socket.remoteAddress}`, 
      `Host头: ${req.headers.host}`);
    res.writeHead(403);
    res.end();
  }
});

function startServer(port = 30073) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`File server running at http://127.0.0.1:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use`);
    }
  });
}

startServer();