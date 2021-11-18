const username = document.querySelector(".username-header")
const crbtn = document.querySelector(".create-room-btn")
const crname = document.querySelector(".create-room-name")
const rooms = document.querySelectorAll(".room-option")

// const copyRoomIdBtns = document.querySelectorAll(".copyRoomIdBtn")
// const jibtn = document.querySelector(".join-invited-room-btn")
// const jiid = document.querySelector(".join-invited-room-id")

rooms.forEach(room => {
    room.addEventListener('click', (event)=>{
        location.assign(`/room/${event.target.getAttribute("roomid")}/${username.innerHTML}`) //res.data
    })    
})
crbtn.addEventListener('click', async()=>{
    if(crname.value.trim() === "") return
    let res = await axios.post('/newmyroom', {roomname : crname.value.trim()}) //res.data
    location.replace(`/lobby/${username.innerHTML}`)
})

// copyRoomIdBtns.forEach(btn => {
//     btn.addEventListener('click', (event)=>{
//         event.preventDefault()
//         navigator.clipboard.writeText(event.target.getAttribute("roomid"))
//         alert("Copied Room ID")
//     })
// })
// jibtn.addEventListener('click', async()=>{
//     if(jiid.value.trim() === "") return
//     let res = await axios.post('/newinvroom', {roomid : jiid.value.trim()}) //res.data
//     location.replace('/lobby')
// })