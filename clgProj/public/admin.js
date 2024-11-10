const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (currentUser?.role === "Admin") {
    const userContent = document.getElementById("user-content");
    userContent.innerHTML = `
        <h2>Admin Controls</h2>
        <button onclick="addCommittee()">Add Committee</button>
        <button onclick="updateCommittee()">Update Committee</button>
        <button onclick="deleteCommittee()">Delete Committee</button>
    `;

    function addCommittee() {
        alert("Add Committee Function");
    }

    function updateCommittee() {
        alert("Update Committee Function");
    }

    function deleteCommittee() {
        alert("Delete Committee Function");
    }
}
