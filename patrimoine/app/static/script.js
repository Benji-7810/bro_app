// Smooth Section Tracker & Indicator Updates
const sections = document.querySelectorAll('.page-section');
const navItems = document.querySelectorAll('.nav-item');
const dots = document.querySelectorAll('.dot');

const observerOptions = {
  root: null,
  threshold: 0.5
};

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const currentId = entry.target.getAttribute('id');
      
      // Update top navigation active links
      navItems.forEach(item => {
        const href = item.getAttribute('href').replace('#', '');
        if (href === currentId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      // Update right side indicator dots
      dots.forEach(dot => {
        const href = dot.getAttribute('href').replace('#', '');
        if (href === currentId) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
    }
  });
}, observerOptions);

sections.forEach(section => {
  sectionObserver.observe(section);
});
