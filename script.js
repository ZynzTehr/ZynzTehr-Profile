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
            // Optional fade based on scroll depth could go here
            if(window.scrollY > 200) {
                 scrollText.style.opacity = '0';
            } else {
                 scrollText.style.opacity = '1';
            }
        }
    });
});
