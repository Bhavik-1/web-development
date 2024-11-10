if (currentUser?.role === "User") {
    const userContent = document.getElementById("user-content");
    userContent.innerHTML = "<h2>Welcome! You have view-only access.</h2>";
}
