// ---------- CONFIG ----------
const content_dir = 'contents/';
const config_file = 'config.yml';

// Only load sections that actually exist on the current page
function getSectionNames() {
  const names = [];
  if (document.getElementById('home-md')) names.push('home');
  if (document.getElementById('publications-md')) names.push('publications');
  if (document.getElementById('posts-md')) names.push('posts');
  return names;
}

// ---------- Anchor jump (stable version) ----------
function jumpToHashStable() {
  const hash = window.location.hash;
  if (!hash) return false;

  const el = document.querySelector(hash);
  if (!el) return false;

  // Adjust scroll position to account for fixed navbar height
  const nav = document.getElementById("mainNav");
  const navH = nav ? nav.offsetHeight : 0;

  const y = el.getBoundingClientRect().top + window.pageYOffset - navH - 12;

  window.scrollTo({ top: y, behavior: "auto" });
  return true;
}

// Retry jumping until the element exists and layout is stable
function jumpToHashWithRetry(maxTry = 60, delay = 100) {
  let n = 0;
  const timer = setInterval(() => {
    n += 1;
    const ok = jumpToHashStable();
    if (ok || n >= maxTry) clearInterval(timer);
  }, delay);
}

window.addEventListener('DOMContentLoaded', () => {

  // 1) Initialize Bootstrap ScrollSpy first
  const mainNav = document.body.querySelector('#mainNav');
  if (mainNav) {
    new bootstrap.ScrollSpy(document.body, {
      target: '#mainNav',
      offset: 74,
    });
  }

  // 2) Collapse responsive navbar automatically after clicking links
  const navbarToggler = document.body.querySelector('.navbar-toggler');
  document.querySelectorAll('#navbarResponsive .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
        navbarToggler.click();
      }
    });
  });

  // 3) Load YAML config + Markdown content in parallel
  const tasks = [];

  // Load YAML config
  tasks.push(
    fetch(content_dir + config_file)
      .then(r => r.text())
      .then(text => {
        const yml = jsyaml.load(text);
        Object.keys(yml).forEach(key => {
          const node = document.getElementById(key);
          if (node) node.innerHTML = yml[key];
        });
      })
  );

  // Load Markdown sections
  marked.use({ mangle: false, headerIds: false });
  const section_names = getSectionNames();

  section_names.forEach(name => {
    tasks.push(
      fetch(content_dir + name + '.md')
        .then(r => r.text())
        .then(md => {
          const target = document.getElementById(name + '-md');
          if (!target) return;

          target.innerHTML = marked.parse(md);

          // Open publication links in a new tab
          if (name === 'publications') {
            document.querySelectorAll('#publications-md a').forEach(a => {
              a.target = "_blank";
              a.rel = "noopener noreferrer";
            });
          }
        })
    );
  });

  // 4) After ALL async content is inserted into DOM:
  Promise.all(tasks)
    .then(() => {
      if (window.MathJax && typeof MathJax.typeset === "function") {
        MathJax.typeset();
      }
    })
    .then(() => {
      // First jump immediately after content render
      jumpToHashStable();

      // Retry briefly to handle late layout shifts
      setTimeout(() => jumpToHashWithRetry(30, 80), 0);
    })
    .catch(err => console.log(err));
});