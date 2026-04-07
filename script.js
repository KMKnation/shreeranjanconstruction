const revealItems = document.querySelectorAll(".reveal");
const statNumbers = document.querySelectorAll(".stat-number");
const navToggle = document.querySelector(".nav-toggle");
const siteHeader = document.querySelector(".site-header");

if (navToggle && siteHeader) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
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

const timelineRoad = document.querySelector(".timeline-road");
const timelineMachine = document.querySelector(".timeline-machine");
const timelineStops = document.querySelectorAll(".timeline-stop[data-stop]");
const roadGuide = document.querySelector(".road-guide");

if (timelineRoad && timelineMachine && timelineStops.length >= 2 && roadGuide) {
  const desktopStops = [0.06, 0.46, 0.9];
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  const mobileStops = [
    { x: 22, y: 18 },
    { x: 22, y: 18 },
    { x: 22, y: 18 },
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
