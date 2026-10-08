// Shared presentation state for the player and navigation option selectors.
function selectToggleOption(options, selected) {
  options.forEach(option => option.setAttribute('aria-pressed', String(option === selected)));
}
