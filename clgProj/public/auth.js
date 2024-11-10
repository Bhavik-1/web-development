// Simulated backend interaction
const users = [];

document.getElementById("login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        window.location.href = "dashboard.html";
    } else {
        alert("Invalid credentials");
    }
});

document.getElementById("signup-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const role = e.target.role.value;

    const newUser = { username, email, password, role };
    users.push(newUser);
    alert("Sign up successful! Please log in.");
    window.location.href = "login.html";
});

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.html";
}
