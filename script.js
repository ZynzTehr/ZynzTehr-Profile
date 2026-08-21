// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------------------
    // 1. Typewriter Effect
    // -----------------------------------------
    const words = ["Web Applications.", "Scalable Backends.", "Interactive Frontends.", "Cool UIs."];
    let i = 0;
    let timer;

    const typewriter = document.getElementById("typewriter-text");

    function typeEffect() {
        if(!typewriter) return;

        let word = words[i].split("");
        var loopTyping = function() {
            if (word.length > 0) {
                typewriter.innerHTML += word.shift();
            } else {
                setTimeout(deletingEffect, 2000); // Wait before deleting
                return;
            }
            timer = setTimeout(loopTyping, 100);
        };
        loopTyping();
    }

    function deletingEffect() {
        let word = words[i].split("");
        var loopDeleting = function() {
            if (word.length > 0) {
                word.pop();
                typewriter.innerHTML = word.join("");
            } else {
                if (words.length > (i + 1)) {
                    i++;
                } else {
                    i = 0;
                }
                setTimeout(typeEffect, 500); // Wait before typing next word
                return;
            }
            timer = setTimeout(loopDeleting, 50);
        };
        loopDeleting();
    }

    // Start typing effect
    typeEffect();

    // -----------------------------------------
    // 2. GSAP Intro Animations (Hero Section)
    // -----------------------------------------
    const tl = gsap.timeline();

    tl.from(".nav-content", {
        y: -50,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
    })
    .from(".hero-badge", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)"
    }, "-=0.3")
    .from(".hero-title", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out"
    }, "-=0.2")
    .from(".hero-subtitle", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
    }, "-=0.3")
    .from(".hero-description", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out"
    }, "-=0.2")
    .from(".hero-cta .btn-primary", {
        x: -20,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)"
    }, "-=0.2")
    .from(".hero-cta .btn-secondary", {
        x: 20,
        opacity: 0,
        duration: 0.5,
        ease: "back.out(1.7)"
    }, "-=0.4")
    .from(".scroll-indicator", {
        opacity: 0,
        duration: 1,
        ease: "power2.inOut"
    }, "-=0.2");

    // -----------------------------------------
    // 3. GSAP Scroll Animations
    // -----------------------------------------
    // Reveal elements on scroll
    const revealElements = document.querySelectorAll('.gs-reveal');

    revealElements.forEach((element) => {
        gsap.from(element, {
            scrollTrigger: {
                trigger: element,
                start: "top 85%", // Animation triggers when top of element hits 85% of viewport
                toggleActions: "play none none reverse"
            },
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        });
    });

    // Sub-stagger animation for skill badges
    const skillCategories = document.querySelectorAll('.skill-category');
    skillCategories.forEach((category) => {
        const badges = category.querySelectorAll('.badge-container img');

        gsap.from(badges, {
            scrollTrigger: {
                trigger: category,
                start: "top 85%",
            },
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.05,
            ease: "power2.out"
        });
    });

    // -----------------------------------------
    // 4. Dynamic Scroll Indicator / Back to Top
    // -----------------------------------------
    const scrollIndicator = document.getElementById('scrollIndicator');
    const scrollText = scrollIndicator.querySelector('.scroll-indicator-text');

    window.addEventListener('scroll', () => {
        if (!scrollIndicator) return;

        // Calculate how far down the user has scrolled plus the window height
        const scrollPosition = window.innerHeight + window.scrollY;

        // Calculate the total height of the document
        // We use Math.max to ensure cross-browser compatibility for document height
        const documentHeight = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );

        // If user is within 50px of the bottom (allowing for slight rendering discrepancies)
        if (scrollPosition >= documentHeight - 50) {
            scrollIndicator.classList.add('back-to-top');
            scrollText.textContent = "Back to Top";
            scrollText.style.opacity = '1';
        } else {
            scrollIndicator.classList.remove('back-to-top');
            scrollText.textContent = "Scroll Down";
            // Fade based on scroll depth
            const opacity = Math.max(0, 1 - (window.scrollY / 200));
            scrollText.style.opacity = opacity.toString();
        }
    });

    // -----------------------------------------
    // 5. Interactive 3D Contribution Graph Switcher
    // -----------------------------------------
    const graphThemes = [
        { name: "Night View", file: "profile-3d-contrib/profile-night-view.svg", tag: "Dark" },
        { name: "Night Rainbow", file: "profile-3d-contrib/profile-night-rainbow.svg", tag: "Rainbow" },
        { name: "Night Green", file: "profile-3d-contrib/profile-night-green.svg", tag: "Dark Green" },
        { name: "Classic Green", file: "profile-3d-contrib/profile-green.svg", tag: "Green" },
        { name: "Green Animated", file: "profile-3d-contrib/profile-green-animate.svg", tag: "Animated" },
        { name: "Northern Season", file: "profile-3d-contrib/profile-season.svg", tag: "Season" },
        { name: "Season Animated", file: "profile-3d-contrib/profile-season-animate.svg", tag: "Animated" },
        { name: "Southern Season", file: "profile-3d-contrib/profile-south-season.svg", tag: "South" },
        { name: "South Animated", file: "profile-3d-contrib/profile-south-season-animate.svg", tag: "Animated" },
        { name: "GitBlock 3D", file: "profile-3d-contrib/profile-gitblock.svg", tag: "Isometric" }
    ];

    let currentThemeIndex = 0;
    let autoCycleInterval = null;

    const graphImg = document.getElementById("graph-3d-img");
    const currentThemeName = document.getElementById("current-theme-name");
    const themePillsContainer = document.getElementById("theme-pills");
    const prevBtn = document.getElementById("prev-theme-btn");
    const nextBtn = document.getElementById("next-theme-btn");
    const toggleAutoplayBtn = document.getElementById("toggle-autoplay-btn");
    const autoplayText = document.getElementById("autoplay-text");
    const playIcon = toggleAutoplayBtn ? toggleAutoplayBtn.querySelector(".play-icon") : null;
    const pauseIcon = toggleAutoplayBtn ? toggleAutoplayBtn.querySelector(".pause-icon") : null;

    if (graphImg && themePillsContainer) {
        // Render theme pills
        graphThemes.forEach((theme, index) => {
            const pill = document.createElement("button");
            pill.className = `theme-pill ${index === 0 ? "active" : ""}`;
            pill.textContent = theme.name;
            pill.setAttribute("aria-label", `Switch to ${theme.name} theme`);
            pill.addEventListener("click", () => {
                stopAutoCycle();
                switchTheme(index);
            });
            themePillsContainer.appendChild(pill);
        });

        function switchTheme(newIndex) {
            currentThemeIndex = (newIndex + graphThemes.length) % graphThemes.length;
            const theme = graphThemes[currentThemeIndex];

            // Animate transition
            graphImg.classList.add("transitioning");

            setTimeout(() => {
                graphImg.src = theme.file;
                graphImg.alt = `3D Contribution Graph - ${theme.name}`;
                if (currentThemeName) {
                    currentThemeName.textContent = theme.name;
                }

                // Update active pill
                const allPills = themePillsContainer.querySelectorAll(".theme-pill");
                allPills.forEach((p, idx) => {
                    p.classList.toggle("active", idx === currentThemeIndex);
                });

                // Fade back in
                graphImg.onload = () => {
                    graphImg.classList.remove("transitioning");
                };
                setTimeout(() => graphImg.classList.remove("transitioning"), 150);
            }, 200);
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                stopAutoCycle();
                switchTheme(currentThemeIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                stopAutoCycle();
                switchTheme(currentThemeIndex + 1);
            });
        }

        function startAutoCycle() {
            if (autoCycleInterval) return;
            autoCycleInterval = setInterval(() => {
                switchTheme(currentThemeIndex + 1);
            }, 4000);
            if (toggleAutoplayBtn) {
                toggleAutoplayBtn.classList.add("active");
                if (playIcon) playIcon.style.display = "none";
                if (pauseIcon) pauseIcon.style.display = "inline-block";
                if (autoplayText) autoplayText.textContent = "Cycling...";
            }
        }

        function stopAutoCycle() {
            if (autoCycleInterval) {
                clearInterval(autoCycleInterval);
                autoCycleInterval = null;
            }
            if (toggleAutoplayBtn) {
                toggleAutoplayBtn.classList.remove("active");
                if (playIcon) playIcon.style.display = "inline-block";
                if (pauseIcon) pauseIcon.style.display = "none";
                if (autoplayText) autoplayText.textContent = "Auto Cycle";
            }
        }

        if (toggleAutoplayBtn) {
            toggleAutoplayBtn.addEventListener("click", () => {
                if (autoCycleInterval) {
                    stopAutoCycle();
                } else {
                    startAutoCycle();
                }
            });
        }
    }
});
