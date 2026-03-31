const pseudoInput=document.getElementById("pseudo")
const todoForm=document.getElementById("todo-form")
const todoInput=document.getElementById("todo-input")
const priorityInput=document.getElementById("priority")
const todoList=document.getElementById("todo-list")
const count=document.getElementById("count")
const statTotal=document.getElementById("stat-total")
const statDone=document.getElementById("stat-done")
const statCritical=document.getElementById("stat-critical")
const searchInput=document.getElementById("search-input")
const filterSegment=document.getElementById("filter-segment")
const devBadgePreview=document.getElementById("dev-badge-preview")
const devAvatar=document.getElementById("dev-avatar")
const devName=document.getElementById("dev-name")
const devRole=document.getElementById("dev-role")

let state={todos:[]}
let currentFilter="all"
let currentSearch=""

const priorityMap={
  low:{label:"Faible"},
  medium:{label:"Moyenne"},
  high:{label:"Haute"},
  critical:{label:"Critique"}
}

pseudoInput.value=localStorage.getItem("todo_pseudo")||""

function normalizePseudo(value){
  return (value||"").trim().slice(0,30)||"Anonyme"
}

function getDevTheme(name){
  const clean=normalizePseudo(name)
  const palettes=[
    ["#4f46e5","#7c3aed"],
    ["#2563eb","#06b6d4"],
    ["#0f766e","#14b8a6"],
    ["#ea580c","#f59e0b"],
    ["#dc2626","#f43f5e"],
    ["#7c2d12","#fb7185"],
    ["#0f766e","#22c55e"],
    ["#1d4ed8","#8b5cf6"]
  ]
  let hash=0
  for(let i=0;i<clean.length;i++)hash=(hash*31+clean.charCodeAt(i))>>>0
  const palette=palettes[hash%palettes.length]
  const rolePool=["Backend Dev","Frontend Dev","Full Stack Dev","Gameplay Dev","UI Engineer","System Dev","Lead Dev","Core Dev"]
  const role=rolePool[hash%rolePool.length]
  return {
    initial:clean.charAt(0).toUpperCase(),
    role,
    background:`linear-gradient(135deg,${palette[0]},${palette[1]})`
  }
}

function updatePreview(){
  const name=normalizePseudo(pseudoInput.value)
  const theme=getDevTheme(name)
  devAvatar.textContent=theme.initial
  devAvatar.style.background=theme.background
  devName.textContent=name
  devRole.textContent=theme.role
  devBadgePreview.style.borderColor="rgba(255,255,255,.06)"
}

function escapeHtml(value){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;")
}

function formatDate(value){
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))return ""
  return new Intl.DateTimeFormat("fr-FR",{
    day:"2-digit",
    month:"2-digit",
    hour:"2-digit",
    minute:"2-digit"
  }).format(date)
}

function getFilteredTodos(){
  return state.todos.filter(todo=>{
    const filterOk=currentFilter==="all"||(currentFilter==="open"&&!todo.done)||(currentFilter==="done"&&todo.done)
    const searchSource=`${todo.text} ${todo.author} ${priorityMap[todo.priority]?.label||""}`.toLowerCase()
    const searchOk=!currentSearch||searchSource.includes(currentSearch)
    return filterOk&&searchOk
  })
}

function renderStats(){
  const total=state.todos.length
  const done=state.todos.filter(todo=>todo.done).length
  const critical=state.todos.filter(todo=>todo.priority==="critical"&&!todo.done).length
  statTotal.textContent=String(total)
  statDone.textContent=String(done)
  statCritical.textContent=String(critical)
}

function renderFilters(){
  document.querySelectorAll(".segment-btn").forEach(button=>{
    button.classList.toggle("active",button.dataset.filter===currentFilter)
  })
}

function render(){
  renderStats()
  renderFilters()

  const visibleTodos=getFilteredTodos()
  const total=state.todos.length
  const done=state.todos.filter(todo=>todo.done).length
  count.textContent=`${done}/${total} terminées`

  if(!visibleTodos.length){
    todoList.innerHTML=`<li class="empty">Aucune tâche visible avec le filtre actuel.</li>`
    return
  }

  todoList.innerHTML=visibleTodos.map(todo=>{
    const theme=getDevTheme(todo.author)
    const priorityLabel=priorityMap[todo.priority]?.label||"Moyenne"
    return `
      <li class="todo priority-${todo.priority} ${todo.done?"done-task":""}">
        <div class="todo-check">
          <input type="checkbox" ${todo.done?"checked":""} onchange="toggleTodo('${todo.id}',this.checked)">
        </div>
        <div class="todo-main">
          <div class="todo-top">
            <div class="todo-title-wrap">
              <h3 class="todo-title">${escapeHtml(todo.text)}</h3>
            </div>
            <div class="todo-actions">
              <button class="delete-btn" onclick="deleteTodo('${todo.id}')">Supprimer</button>
            </div>
          </div>
          <div class="todo-meta-row">
            <div class="dev-badge">
              <span class="dev-avatar" style="background:${theme.background}">${escapeHtml(theme.initial)}</span>
              <div class="dev-meta">
                <strong>${escapeHtml(normalizePseudo(todo.author))}</strong>
                <span>${escapeHtml(theme.role)}</span>
              </div>
            </div>
            <span class="priority-badge priority-${todo.priority}">${escapeHtml(priorityLabel)}</span>
            <span class="status-badge ${todo.done?"status-done":"status-open"}">${todo.done?"Terminée":"Ouverte"}</span>
            <span class="status-badge status-open">${escapeHtml(formatDate(todo.createdAt))}</span>
          </div>
        </div>
      </li>
    `
  }).join("")
}

async function loadState(){
  const res=await fetch("/api/state")
  state=await res.json()
  render()
}

async function toggleTodo(id,done){
  await fetch(`/api/todos/${id}`,{
    method:"PATCH",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({done})
  })
}

async function deleteTodo(id){
  await fetch(`/api/todos/${id}`,{
    method:"DELETE"
  })
}

pseudoInput.addEventListener("input",()=>{
  localStorage.setItem("todo_pseudo",normalizePseudo(pseudoInput.value))
  updatePreview()
})

todoForm.addEventListener("submit",async e=>{
  e.preventDefault()
  const text=todoInput.value.trim()
  const author=normalizePseudo(pseudoInput.value)
  const priority=priorityInput.value
  if(!text)return
  await fetch("/api/todos",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text,author,priority})
  })
  todoInput.value=""
  priorityInput.value="medium"
})

searchInput.addEventListener("input",()=>{
  currentSearch=searchInput.value.trim().toLowerCase()
  render()
})

filterSegment.addEventListener("click",e=>{
  const button=e.target.closest(".segment-btn")
  if(!button)return
  currentFilter=button.dataset.filter
  render()
})

window.toggleTodo=toggleTodo
window.deleteTodo=deleteTodo

updatePreview()
loadState()

const events=new EventSource("/api/events")
events.onmessage=e=>{
  state=JSON.parse(e.data)
  render()
}
