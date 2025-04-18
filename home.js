function login() {
  window.location.href = '/home/home.html';
}

function logout() {
  window.location.href = '/index.html';
}
  
function goTo(page) {
  window.location.href = page;
}

function show(id) {
  var popup = document.getElementById(id);
  popup.classList.toggle("show");
}

function close(id) {
  var popup = document.getElementById(id);
  popup.classList.remove("show");
}