const http=require("http")
const fs=require("fs")
const path=require("path")
const {randomUUID}=require("crypto")

const port=process.env.PORT||3000
const publicDir=path.join(__dirname,"public")
const dataDir=path.join(__dirname,"data")
const dataFile=path.join(dataDir,"todos.json")

if(!fs.existsSync(dataDir))fs.mkdirSync(dataDir,{recursive:true})
if(!fs.existsSync(dataFile))fs.writeFileSync(dataFile,JSON.stringify({todos:[]},null,2))

let clients=[]

function readState(){
  try{
    return JSON.parse(fs.readFileSync(dataFile,"utf8"))
  }catch{
    return {todos:[]}
  }
}

function writeState(state){
  fs.writeFileSync(dataFile,JSON.stringify(state,null,2))
}

function sendJson(res,status,data){
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8"})
  res.end(JSON.stringify(data))
}

function sendFile(res,filePath){
  const ext=path.extname(filePath).toLowerCase()
  const types={
    ".html":"text/html; charset=utf-8",
    ".css":"text/css; charset=utf-8",
    ".js":"application/javascript; charset=utf-8",
    ".json":"application/json; charset=utf-8"
  }
  fs.readFile(filePath,(err,content)=>{
    if(err){
      res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"})
      res.end("Not found")
      return
    }
    res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream"})
    res.end(content)
  })
}

function broadcast(){
  const payload=`data: ${JSON.stringify(readState())}\n\n`
  clients.forEach(client=>client.write(payload))
}

function parseBody(req){
  return new Promise((resolve,reject)=>{
    let body=""
    req.on("data",chunk=>body+=chunk)
    req.on("end",()=>{
      try{
        resolve(body?JSON.parse(body):{})
      }catch(err){
        reject(err)
      }
    })
    req.on("error",reject)
  })
}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host}`)
  const pathname=url.pathname

  if(req.method==="GET"&&pathname==="/api/state"){
    sendJson(res,200,readState())
    return
  }

  if(req.method==="GET"&&pathname==="/api/events"){
    res.writeHead(200,{
      "Content-Type":"text/event-stream",
      "Cache-Control":"no-cache",
      "Connection":"keep-alive"
    })
    res.write(`data: ${JSON.stringify(readState())}\n\n`)
    clients.push(res)
    req.on("close",()=>{
      clients=clients.filter(client=>client!==res)
    })
    return
  }

  if(req.method==="POST"&&pathname==="/api/todos"){
    try{
      const body=await parseBody(req)
      const author=String(body.author||"Anonyme").trim().slice(0,30)||"Anonyme"
      const text=String(body.text||"").trim().slice(0,200)
      if(!text){
        sendJson(res,400,{error:"Texte requis"})
        return
      }
      const state=readState()
      const todo={
        id:randomUUID(),
        text,
        author,
        done:false,
        createdAt:new Date().toISOString()
      }
      state.todos.unshift(todo)
      writeState(state)
      broadcast()
      sendJson(res,201,todo)
    }catch{
      sendJson(res,400,{error:"Requête invalide"})
    }
    return
  }

  if(req.method==="PATCH"&&pathname.startsWith("/api/todos/")){
    try{
      const id=pathname.split("/").pop()
      const body=await parseBody(req)
      const state=readState()
      const todo=state.todos.find(item=>item.id===id)
      if(!todo){
        sendJson(res,404,{error:"Tâche introuvable"})
        return
      }
      if(typeof body.done==="boolean")todo.done=body.done
      writeState(state)
      broadcast()
      sendJson(res,200,todo)
    }catch{
      sendJson(res,400,{error:"Requête invalide"})
    }
    return
  }

  if(req.method==="DELETE"&&pathname.startsWith("/api/todos/")){
    const id=pathname.split("/").pop()
    const state=readState()
    const index=state.todos.findIndex(item=>item.id===id)
    if(index===-1){
      sendJson(res,404,{error:"Tâche introuvable"})
      return
    }
    state.todos.splice(index,1)
    writeState(state)
    broadcast()
    sendJson(res,200,{success:true})
    return
  }

  if(req.method==="GET"&&pathname==="/"){
    sendFile(res,path.join(publicDir,"index.html"))
    return
  }

  const staticPath=path.join(publicDir,pathname)
  if(staticPath.startsWith(publicDir)&&fs.existsSync(staticPath)&&fs.statSync(staticPath).isFile()){
    sendFile(res,staticPath)
    return
  }

  res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"})
  res.end("Not found")
})

server.listen(port,()=>{
  console.log(`Server running on port ${port}`)
})
