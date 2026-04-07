const revealItems = document.querySelectorAll(".reveal");
const statNumbers = document.querySelectorAll(".stat-number");
const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (navToggle && siteHeader) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

if (siteHeader) {
  const syncHeaderState = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 18);
  };

  syncHeaderState();
  window.addEventListener("scroll", syncHeaderState, { passive: true });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px",
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
  revealObserver.observe(item);
});

const animateValue = (element) => {
  const target = Number(element.dataset.target || 0);
  const duration = 1500;
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

const statObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      animateValue(entry.target);
      statObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.5 }
);

statNumbers.forEach((stat) => statObserver.observe(stat));

const interactiveCards = document.querySelectorAll(
  ".glass-card, .stat-grid article, .feature-card, .service-panel, .service-category, .reference-card, .matrix-card, .leader-card, .contact-card, .overview-panel, .cta-panel"
);

if (!reducedMotionQuery.matches) {
  const canTilt = () => window.innerWidth > 1024;

  interactiveCards.forEach((card) => {
    card.classList.add("interactive-card");

    card.addEventListener("pointermove", (event) => {
      if (!canTilt()) {
        return;
      }

      const rect = card.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeY = (event.clientY - rect.top) / rect.height;
      const tiltY = (relativeX - 0.5) * 8;
      const tiltX = (0.5 - relativeY) * 8;

      card.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
      card.classList.add("is-tilting");
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.classList.remove("is-tilting");
    });
  });
}

const signalRotators = document.querySelectorAll("[data-signal-rotator]");

if (!reducedMotionQuery.matches && signalRotators.length) {
  signalRotators.forEach((rotator) => {
    const cards = Array.from(rotator.querySelectorAll("[data-signal-card]"));

    if (cards.length < 2) {
      return;
    }

    let activeIndex = Math.max(
      cards.findIndex((card) => card.classList.contains("is-active")),
      0
    );
    let intervalId = null;

    const setActiveCard = (index) => {
      cards.forEach((card, cardIndex) => {
        card.classList.toggle("is-active", cardIndex === index);
      });
    };

    const startRotation = () => {
      if (intervalId) {
        return;
      }

      intervalId = window.setInterval(() => {
        activeIndex = (activeIndex + 1) % cards.length;
        setActiveCard(activeIndex);
      }, 2400);
    };

    const stopRotation = () => {
      if (!intervalId) {
        return;
      }

      window.clearInterval(intervalId);
      intervalId = null;
    };

    setActiveCard(activeIndex);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startRotation();
          } else {
            stopRotation();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(rotator);

    cards.forEach((card, index) => {
      card.addEventListener("pointerenter", () => {
        activeIndex = index;
        setActiveCard(activeIndex);
      });
    });
  });
}

const timelineRoad = document.querySelector(".timeline-road");
const timelineMachine = document.querySelector(".timeline-machine");
const timelineStops = document.querySelectorAll(".timeline-stop[data-stop]");
const roadGuide = document.querySelector(".road-guide");

if (timelineRoad && timelineMachine && timelineStops.length >= 2 && roadGuide) {
  const desktopStops = [0.06, 0.46, 0.9];
  const prefersReducedMotion = reducedMotionQuery;

  const mobileStops = [
    { x: 26, y: 112 },
    { x: 26, y: 112 },
    { x: 26, y: 112 },
  ];

  let activeIndex = 0;
  let direction = 1;
  let pauseTimer = null;
  let animationFrame = null;
  let timelineRunning = false;
  let timelineObserver = null;

  const setStopState = (index) => {
    timelineStops.forEach((stop, stopIndex) => {
      stop.classList.toggle("is-active", stopIndex === index);
    });
  };

  const setMachineVisualState = (traveling) => {
    timelineMachine.classList.toggle("is-traveling", traveling);
    timelineMachine.classList.toggle("is-paused", !traveling);
  };

  const placeMachineAtRatio = (ratio, traveling) => {
    if (window.innerWidth <= 1180) {
      const stop = mobileStops[activeIndex] || mobileStops[0];
      timelineMachine.style.setProperty("--machine-x", `${stop.x}px`);
      timelineMachine.style.setProperty("--machine-y", `${stop.y}px`);
      timelineMachine.style.setProperty("--machine-rotate", "0deg");
    } else {
      const pathLength = roadGuide.getTotalLength();
      const pointAt = pathLength * ratio;
      const point = roadGuide.getPointAtLength(pointAt);
      const ahead = roadGuide.getPointAtLength(
        Math.min(pathLength, pointAt + 10)
      );
      const svg = roadGuide.ownerSVGElement;
      const viewBox = svg?.viewBox?.baseVal;
      const scaleX = viewBox ? timelineRoad.clientWidth / viewBox.width : 1;
      const scaleY = viewBox ? timelineRoad.clientHeight / viewBox.height : 1;
      const x = point.x * scaleX;
      const y = point.y * scaleY;
      const angle = Math.atan2(
        (ahead.y - point.y) * scaleY,
        (ahead.x - point.x) * scaleX
      );
      timelineMachine.style.setProperty("--machine-x", `${x - 54}px`);
      timelineMachine.style.setProperty("--machine-y", `${y - 78}px`);
      timelineMachine.style.setProperty(
        "--machine-rotate",
        `${angle * (180 / Math.PI)}deg`
      );
    }

    setMachineVisualState(traveling);
  };

  const clearTimelineWork = () => {
    window.clearTimeout(pauseTimer);
    window.cancelAnimationFrame(animationFrame);
  };

  const pauseAtStop = (index) => {
    activeIndex = index;
    setStopState(activeIndex);
    placeMachineAtRatio(desktopStops[activeIndex], false);

    pauseTimer = window.setTimeout(() => {
      if (!timelineRunning || window.innerWidth <= 1180) {
        return;
      }

      let nextIndex = activeIndex + direction;

      if (nextIndex >= timelineStops.length || nextIndex < 0) {
        direction *= -1;
        nextIndex = activeIndex + direction;
      }

      const startRatio = desktopStops[activeIndex];
      const endRatio = desktopStops[nextIndex];
      const startTime = performance.now();
      const duration = 2400;
      setMachineVisualState(true);

      const animateStep = (now) => {
        if (!timelineRunning) {
          return;
        }

        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const currentRatio = startRatio + (endRatio - startRatio) * eased;

        placeMachineAtRatio(currentRatio, true);

        if (progress < 1) {
          animationFrame = window.requestAnimationFrame(animateStep);
          return;
        }

        pauseAtStop(nextIndex);
      };

      animationFrame = window.requestAnimationFrame(animateStep);
    }, 3200);
  };

  const startTimeline = () => {
    if (timelineRunning || window.innerWidth <= 1180 || prefersReducedMotion.matches) {
      return;
    }

    timelineRunning = true;
    clearTimelineWork();
    pauseAtStop(activeIndex);
  };

  const stopTimeline = () => {
    timelineRunning = false;
    clearTimelineWork();
    placeMachineAtRatio(desktopStops[activeIndex], false);
  };

  placeMachineAtRatio(desktopStops[0], false);
  setStopState(0);

  if (window.innerWidth > 1180 && !prefersReducedMotion.matches) {
    timelineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTimeline();
          } else {
            stopTimeline();
          }
        });
      },
      { threshold: 0.35 }
    );

    timelineObserver.observe(timelineRoad);
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 1180) {
      stopTimeline();
      activeIndex = 0;
      direction = 1;
      placeMachineAtRatio(desktopStops[0], false);
      setStopState(0);
      return;
    }

    if (prefersReducedMotion.matches) {
      placeMachineAtRatio(desktopStops[activeIndex], false);
      setStopState(activeIndex);
      return;
    }

    placeMachineAtRatio(desktopStops[activeIndex], false);
    setStopState(activeIndex);
    startTimeline();
  });

  prefersReducedMotion.addEventListener("change", () => {
    if (prefersReducedMotion.matches) {
      stopTimeline();
      activeIndex = 0;
      direction = 1;
      placeMachineAtRatio(desktopStops[0], false);
      setStopState(0);
      return;
    }

    startTimeline();
  });
}
