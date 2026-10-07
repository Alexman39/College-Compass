// Get all the buttons with class "class-title"
const classTitles = document.querySelectorAll('.class-title');

// Add a click event listener to each button
classTitles.forEach(button => {
    button.addEventListener('click', () => {
        // Get the associated class-info div
        const info = button.nextElementSibling;

        // If the info is not already visible, set it to its natural height, then show it
        if (info.style.height === "0px" || info.style.height === "") {
            info.style.height = `${info.scrollHeight}px`; // Set the height to its scrollHeight (natural height)
        } else {
            info.style.height = "0px"; // Set height back to 0 to hide it
        }
    });
});
