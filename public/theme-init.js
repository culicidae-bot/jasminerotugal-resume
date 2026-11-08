(function () {
  var theme = 'dark';
  try {
    var saved = window.localStorage.getItem('jasmine-theme');
    if (saved === 'light' || saved === 'dark') {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (error) {
    theme = 'dark';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
