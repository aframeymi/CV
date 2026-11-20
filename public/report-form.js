// Fills the neighborhood list of the report form with the neighborhoods of the chosen city.
// The cities come from a JSON block in the page, which the browser reads as data and never runs.
const cities = JSON.parse(document.getElementById('cities-data').textContent);
const citySelect = document.getElementById('city');
const neighborhoodSelect = document.getElementById('neighborhoodId');

function addOption(select, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  select.append(option);
}

citySelect.addEventListener('change', () => {
  neighborhoodSelect.replaceChildren();
  addOption(neighborhoodSelect, '', 'Select a neighborhood');
  const city = cities.find((candidate) => candidate.id === citySelect.value);
  city?.neighborhoods.forEach((neighborhood) => addOption(neighborhoodSelect, neighborhood.id, neighborhood.name));
  neighborhoodSelect.disabled = !city;
});
