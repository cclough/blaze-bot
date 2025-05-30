// Common font loading detection for all pages
(function() {
  // Function to check if fonts are loaded
  function areFontsLoaded() {
    // Check for critical fonts
    const criticalFonts = ['Audiowide', 'Teko'];
    
    if ('fonts' in document) {
      return Promise.all(
        criticalFonts.map(font => document.fonts.check(`1em ${font}`))
      ).then(results => results.every(result => result));
    }
    
    // Fallback for browsers without font loading API
    return new Promise(resolve => {
      setTimeout(() => resolve(true), 100);
    });
  }
  
  // Function to show content
  function showContent() {
    document.body.classList.add('loaded');
  }
  
  // Wait for DOM and fonts
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      areFontsLoaded().then(showContent);
    });
  } else {
    areFontsLoaded().then(showContent);
  }
  
  // Fallback timeout to ensure content shows even if font detection fails
  setTimeout(showContent, 500);
})();

// Available movement animations
const animations = [
    'float-left-to-right',
    'float-right-to-left', 
    'float-top-to-bottom',
    'float-bottom-to-top',
    'float-diagonal-1',
    'float-diagonal-2'
];

// Function to create a single WBC with its internal elements
function createCell(isGlitch, isIntenseGlitch) {
    // Create wrapper for movement
    const wrapper = document.createElement('div');
    wrapper.classList.add('wbc-wrapper');
    wrapper.style.position = 'absolute';
    
    // Create the actual cell
    const wbc = document.createElement('div');
    wbc.classList.add('wbc');
    if (isGlitch) wbc.classList.add('glitch');
    if (isIntenseGlitch) wbc.classList.add('glitch-intense');

    // Simplified internal structure - just pseudopods and vesicles
    const innerHTML = `
        <div class="pseudopod"></div>
        <div class="pseudopod"></div>
        <div class="pseudopod"></div>
        <div class="vesicle"></div>
        <div class="vesicle"></div>
    `;
    wbc.innerHTML = innerHTML;
    
    // Add cell to wrapper, wrapper to container
    wrapper.appendChild(wbc);
    document.querySelector('.background-container').appendChild(wrapper);
    return wrapper; // Return wrapper, not cell
}

// Function to populate the screen with a calculated number of cells based on desired coverage
function populateCells() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // SIMPLE APPROACH: Fixed counts that guarantee visibility - REDUCED BY 30%
    const visibleCellsInViewport = 36; // Reduced from 52 (30% reduction)
    const bufferCellsOffScreen = 21; // Reduced from 30 (30% reduction)
    const totalCellsNeeded = visibleCellsInViewport + bufferCellsOffScreen;

    const container = document.querySelector('.background-container');
    container.querySelectorAll('.wbc').forEach(el => el.remove()); // Clear existing cells

    console.log(`Starting to create ${totalCellsNeeded} cells (${visibleCellsInViewport} in viewport, ${bufferCellsOffScreen} off-screen)`);
    let createdCount = 0;

    // First: Create cells INSIDE viewport (guaranteed visible)
    for (let i = 0; i < visibleCellsInViewport; i++) {
        const isGlitch = Math.random() < 0.15;
        const isIntenseGlitch = isGlitch && Math.random() < 0.1;

        const cell = createCell(isGlitch && !isIntenseGlitch, isIntenseGlitch);
        
        // Position strictly within viewport boundaries
        const randomX = Math.random() * (viewportWidth - 150); // Leave 150px margin
        const randomY = Math.random() * (viewportHeight - 150); // Leave 150px margin
        
        cell.style.left = `${randomX}px`;
        cell.style.top = `${randomY}px`;
        cell.style.position = 'absolute';
        cell.style.zIndex = '10';
        
        createdCount++;
    }

    // Second: Create buffer cells off-screen for continuous flow
    for (let i = 0; i < bufferCellsOffScreen; i++) {
        const isGlitch = Math.random() < 0.15;
        const isIntenseGlitch = isGlitch && Math.random() < 0.1;

        const cell = createCell(isGlitch && !isIntenseGlitch, isIntenseGlitch);
        
        // Position off-screen
        const side = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom
        let randomX, randomY;
        
        if (side === 0) { // left side
            randomX = -200 - Math.random() * 100;
            randomY = Math.random() * viewportHeight;
        } else if (side === 1) { // right side
            randomX = viewportWidth + 50 + Math.random() * 100;
            randomY = Math.random() * viewportHeight;
        } else if (side === 2) { // top
            randomX = Math.random() * viewportWidth;
            randomY = -200 - Math.random() * 100;
        } else { // bottom
            randomX = Math.random() * viewportWidth;
            randomY = viewportHeight + 50 + Math.random() * 100;
        }
        
        cell.style.left = `${randomX}px`;
        cell.style.top = `${randomY}px`;
        cell.style.position = 'absolute';
        cell.style.zIndex = '10';
        
        createdCount++;
    }

    console.log(`✅ Created ${createdCount} total cells. Should see ${visibleCellsInViewport} in viewport.`);
    
    // Verify cells were actually added to DOM
    const actualCellsInDOM = container.querySelectorAll('.wbc').length;
    console.log(`🔍 DOM verification: ${actualCellsInDOM} .wbc elements found in container`);
}

// Function to apply glitchy movement effects to random cells
function applyGlitchyMovement() {
    const wrappers = document.querySelectorAll('.wbc-wrapper');
    const glitchTypes = ['glitch-disappear', 'glitch-jitter', 'glitch-teleport', 'glitch-stutter'];
    
    wrappers.forEach(wrapper => {
        const wbc = wrapper.querySelector('.wbc');
        
        // 29.3% chance for a cell to have glitchy movement (30% more than 22.5%)
        if (Math.random() < 0.293) {
            const randomGlitchType = glitchTypes[Math.floor(Math.random() * glitchTypes.length)];
            wbc.classList.add('glitch-movement', randomGlitchType);
            
            // Remove glitch effect after some time and reapply later
            setTimeout(() => {
                wbc.classList.remove('glitch-movement', randomGlitchType);
                
                // Chance to reapply a different glitch later
                if (Math.random() < 0.3) {
                    setTimeout(() => {
                        const newGlitchType = glitchTypes[Math.floor(Math.random() * glitchTypes.length)];
                        wbc.classList.add('glitch-movement', newGlitchType);
                    }, 3000 + Math.random() * 7000); // 3-10 seconds later
                }
            }, 8000 + Math.random() * 4000); // Remove after 8-12 seconds
        }
    });
}

// Generate random movement patterns and speeds for each cell
function randomizeWBCPositions() {
    const wrappers = document.querySelectorAll('.wbc-wrapper');
    console.log(`🔄 Starting to animate ${wrappers.length} cell wrappers...`);
    
    wrappers.forEach((wrapper, index) => {
        const wbc = wrapper.querySelector('.wbc');
        
        // Remove any conflicting classes that might pause animations
        wbc.classList.remove('glitch-periodic');
        
        // Apply random size class with weighted distribution
        const sizes = ['tiny', 'small', 'medium', 'large', 'huge'];
        wbc.classList.remove(...sizes); // Remove any existing size
        
        // Weighted distribution: smaller cells more common
        const sizeRandom = Math.random();
        let randomSize;
        if (sizeRandom < 0.35) {
            randomSize = 'tiny';      // 35% chance (increased)
        } else if (sizeRandom < 0.65) {
            randomSize = 'small';     // 30% chance (increased)
        } else if (sizeRandom < 0.85) {
            randomSize = 'medium';    // 20% chance (same)
        } else if (sizeRandom < 0.95) {
            randomSize = 'large';     // 10% chance (reduced from 15%)
        } else {
            randomSize = 'huge';      // 5% chance (reduced from 10%)
        }
        wbc.classList.add(randomSize);
        
        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        const morphAnimation = 'morph-cell';

        // VERY FAST movement for wrapper
        const baseSpeed = 12 + Math.random() * 34; // between 12s and 46s (50% slower)
        
        // Apply movement animation to WRAPPER only
        wrapper.style.animation = `${randomAnimation} ${baseSpeed}s linear infinite`;
        wrapper.style.animationDelay = '0s';
        wrapper.style.animationPlayState = 'running';
        
        // Apply morph, rotation, and scale to inner CELL
        const morphSpeed = 1 + Math.random() * 2; // between 1s and 3s
        const rotationSpeed = 10 + Math.random() * 15; // 10-25s rotation
        const rotationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
        
        // NO MORE SCALE - size is handled by CSS classes
        
        wbc.style.animation = `
            ${morphAnimation} ${morphSpeed}s ease-in-out infinite,
            spin-cell ${rotationSpeed}s linear infinite ${rotationDirection}
        `;
        wbc.style.animationDelay = '0s, 0s';
        wbc.style.animationPlayState = 'running';
        
        // Debug: Log size class
        if (index % 10 === 0) {
            console.log(`Cell ${index}: size=${randomSize}, movement=${baseSpeed}s`);
        }
        
        console.log(`Cell ${index}: movement ${baseSpeed}s (wrapper), morph ${morphSpeed}s, spin ${rotationSpeed}s`);
    });
    
    console.log(`✅ Applied separated animations to all ${wrappers.length} cells`);
}

// Enhanced glitch effects
function triggerRandomGlitch() {
    const glitchElements = document.querySelectorAll('.glitch, .glitch-intense');
    const randomElement = glitchElements[Math.floor(Math.random() * glitchElements.length)];
    
    if (randomElement && Math.random() < 0.45) { // Increased from 0.3 to 0.45 (50% more often)
        // Temporary super-glitch effect
        randomElement.style.filter = 'drop-shadow(0 0 10px rgba(255,255,255,0.3)) contrast(2) brightness(1.5)';
        randomElement.style.transform = `translate(${(Math.random()-0.5)*6}px, ${(Math.random()-0.5)*6}px) scale(${0.9 + Math.random()*0.2})`;
        
        setTimeout(() => {
            randomElement.style.filter = '';
            randomElement.style.transform = '';
        }, 100 + Math.random() * 200);
    }
}

// Add random static interference
function addStaticInterference() {
    const container = document.querySelector('.background-container');
    if (Math.random() < 0.1) {
        container.style.filter = 'contrast(1.8) brightness(1.2) hue-rotate(5deg)';
        setTimeout(() => {
            container.style.filter = '';
        }, 50 + Math.random() * 100);
    }
}

// Periodic cell regeneration for continuous flow
function regenerateCell() {
    const wrappers = document.querySelectorAll('.wbc-wrapper');
    if (wrappers.length === 0) return; // Guard against no cells
    const randomWrapper = wrappers[Math.floor(Math.random() * wrappers.length)];
    const randomWBC = randomWrapper.querySelector('.wbc');
    
    // Get viewport dimensions for new position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Set new random position at edges based on animation direction
    const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
    
    // Position at appropriate edge based on animation direction
    let newX, newY;
    if (randomAnimation === 'float-left-to-right') {
        newX = -120; // Start off left edge
        newY = Math.random() * viewportHeight;
    } else if (randomAnimation === 'float-right-to-left') {
        newX = viewportWidth + 120; // Start off right edge
        newY = Math.random() * viewportHeight;
    } else if (randomAnimation === 'float-top-to-bottom') {
        newX = Math.random() * viewportWidth;
        newY = -120; // Start off top edge
    } else if (randomAnimation === 'float-bottom-to-top') {
        newX = Math.random() * viewportWidth;
        newY = viewportHeight + 120; // Start off bottom edge
    } else if (randomAnimation === 'float-diagonal-1') {
        newX = -120; // Start off top-left
        newY = -120;
    } else { // float-diagonal-2
        newX = viewportWidth + 120; // Start off top-right
        newY = -120;
    }
    
    randomWrapper.style.left = `${newX}px`;
    randomWrapper.style.top = `${newY}px`;
    
    // Use simplified morph animation
    const morphAnimation = 'morph-cell';
    
    // Random animation timing - FAST movement
    const baseDuration = 12 + Math.random() * 34; // 12-46s (50% slower)
    const morphDuration = 1 + Math.random() * 2;
    const rotationSpeed = 10 + Math.random() * 15;
    const rotationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
    
    // Set new animation on wrapper (movement only)
    randomWrapper.style.animation = `${randomAnimation} ${baseDuration}s linear infinite`;
    
    // Update cell animations (morph, rotation, keep scale)
    // Occasionally change size when regenerating (30% chance)
    if (Math.random() < 0.3) {
        const sizes = ['tiny', 'small', 'medium', 'large', 'huge'];
        randomWBC.classList.remove(...sizes);
        
        // Use same weighted distribution
        const sizeRandom = Math.random();
        let newSize;
        if (sizeRandom < 0.35) {
            newSize = 'tiny';      // 35% chance
        } else if (sizeRandom < 0.65) {
            newSize = 'small';     // 30% chance
        } else if (sizeRandom < 0.85) {
            newSize = 'medium';    // 20% chance
        } else if (sizeRandom < 0.95) {
            newSize = 'large';     // 10% chance
        } else {
            newSize = 'huge';      // 5% chance
        }
        randomWBC.classList.add(newSize);
        console.log(`Regenerated cell changed to size: ${newSize}`);
    }
    
    randomWBC.style.animation = `
        ${morphAnimation} ${morphDuration}s ease-in-out infinite,
        spin-cell ${rotationSpeed}s linear infinite ${rotationDirection}
    `;
}

// Function to create blood particles
function createBloodParticle() {
    const blazeLogo = document.querySelector('.blaze-logo');
    if (!blazeLogo) return;
    
    const particle = document.createElement('div');
    particle.classList.add('blood-particle');
    
    // Random size between 2px and 8px
    const size = 2 + Math.random() * 6;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // Random vertical position within the logo area
    const logoHeight = blazeLogo.offsetHeight;
    const yPosition = Math.random() * logoHeight;
    particle.style.top = `${yPosition}px`;
    particle.style.left = '-50px'; // Start further left to prevent sticking
    
    // Random animation duration between 2s and 4s
    const duration = 2 + Math.random() * 2;
    particle.style.animationDuration = `${duration}s`;
    
    // No delay to prevent accumulation
    particle.style.animationDelay = '0s';
    
    blazeLogo.appendChild(particle);
    
    // Remove particle after animation completes with buffer time
    setTimeout(() => {
        if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
        }
    }, (duration + 0.5) * 1000); // Add 0.5s buffer
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // SKIP ALL ANIMATIONS IF ON SIGNUP PAGE
    if (window.stopAnimations) {
        console.log('Animations disabled for signup page');
        return;
    }
    
    populateCells();
    randomizeWBCPositions();
    
    // Apply initial glitchy movement effects
    setTimeout(() => {
        applyGlitchyMovement();
    }, 2000); // Wait 2 seconds after initial setup
    
    // Start creating blood particles - 125% more frequent than original
    setInterval(createBloodParticle, 133 + Math.random() * 178); // Create particle every 133-311ms (125% more frequent than original)
    
    setInterval(triggerRandomGlitch, 2667 + Math.random() * 2000); // 50% more often: was 4000 + Math.random() * 3000
    setInterval(addStaticInterference, 6000 + Math.random() * 4000);
    setInterval(regenerateCell, 10000 + Math.random() * 5000);
    
    // Periodically reapply glitchy movement effects - 50% more often
    setInterval(() => {
        applyGlitchyMovement();
    }, 10000 + Math.random() * 6667); // 50% more often: was 15000 + Math.random() * 10000

    // Recalculate on resize for responsiveness
    window.addEventListener('resize', () => {
        populateCells();
        randomizeWBCPositions();
        setTimeout(() => {
            applyGlitchyMovement();
        }, 1000);
    });
});