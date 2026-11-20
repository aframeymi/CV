// Opens or closes the profile menu in the navbar when the picture or the name is clicked
document.querySelectorAll('[data-toggles-menu]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('hiddenLinks').classList.toggle('show');
  });
});
