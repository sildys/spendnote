@echo off
echo Starting SpendNote development server...
echo.
echo Open your browser and go to: http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo.
node -e "const http=require('http'),fs=require('fs'),path=require('path');http.createServer((req,res)=>{let file=req.url==='/'?'/index.html':req.url;let filePath=path.join(__dirname,file);fs.readFile(filePath,(err,data)=>{if(err){res.writeHead(404);res.end('404 Not Found');return;}let ext=path.extname(file);let contentType={'html':'text/html','css':'text/css','js':'application/javascript','json':'application/json','png':'image/png','jpg':'image/jpeg','svg':'image/svg+xml'}[ext.slice(1)]||'text/plain';res.writeHead(200,{'Content-Type':contentType});res.end(data);});}).listen(8000,()=>console.log('Server running at http://localhost:8000'));"
