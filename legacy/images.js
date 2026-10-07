function openModal(imageSrc) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImg");
    modal.style.display = "flex";
    modalImg.src = imageSrc;
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}