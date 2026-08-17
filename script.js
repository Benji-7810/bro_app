// Reveal animation for section content
const revealElements = document.querySelectorAll('.section-inner');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.4 });

revealElements.forEach(el => observer.observe(el));

// Subtle parallax on scroll for hero background (optional)
window.addEventListener('scroll', () => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const y = window.scrollY;
  if (y < window.innerHeight) {
    hero.style.opacity = 1 - y / window.innerHeight;
  }
});
