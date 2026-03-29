const pseudoInput=document.getElementById("pseudo")
const todoForm=document.getElementById("todo-form")
const todoInput=document.getElementById("todo-input")
const todoList=document.getElementById("todo-list")
const count=document.getElementById("count")

let state={todos:[]}

pseudoInput.value=localStorage.getItem("todo_pseudo")||""

pseudoInput.addEventListener("input",()=>{
  localStorage.setItem("todo_pseudo",pseudoInput.value.trim())
})

todoForm.addEventListener("submit",async e=>{
  e.preventDefault()
  const text=todoInput.value.trim()
  const author=pseudoInput.value.trim()||"Anonyme"
  if(!text)return
  await fetch("/api/todos",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({text,author})
  })
  todoInput.value=""
})

function render(){
  const total=state.todos.length
  const done=state.todos.filter(todo=>todo.done).length
  count.textContent=`${done}/${total} terminées`

  if(!total){
    todoList.innerHTML=`<li class="empty">Aucune tâche</li>`
    return
  }

  todoList.innerHTML=state.todos.map(todo=>`
    <li class="todo ${todo.done?"done":""}">
      <div class="todo-left">
        <input type="checkbox" ${todo.done?"checked":""} onchange="toggleTodo('${todo.id}',this.checked)">
        <div class="todo-text">
          <strong>${escapeHtml(todo.text)}</strong>
          <span>Par ${escapeHtml(todo.author)}</span>
        </div>
      </div>
      <button class="delete-btn" onclick="deleteTodo('${todo.id}')">Supprimer</button>
    </li>
  `).join("")
}

function escapeHtml(value){
  return value
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;")
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

window.toggleTodo=toggleTodo
window.deleteTodo=deleteTodo

loadState()

const events=new EventSource("/api/events")
events.onmessage=e=>{
  state=JSON.parse(e.data)
  render()
}
