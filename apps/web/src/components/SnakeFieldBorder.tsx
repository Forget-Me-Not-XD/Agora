'use client';

import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
    type RefObject,
} from 'react';
import anime from 'animejs';

export type SnakeState = 'email' | 'password' | 'submit';

export interface SnakeFieldBorderHandle {
    highlight: (state: SnakeState) => void;
}

interface SnakeFieldBorderProps {
    containerRef: RefObject<HTMLElement>;
    emailRef: RefObject<HTMLElement>;
    passwordRef: RefObject<HTMLElement>;
    submitRef: RefObject<HTMLElement>;
}

const RING_GAP = 8;      // px the ring sits outside the submit button's edge
const RING_RADIUS = 28;  // corner radius of the ring
const BIG_GAP = 5000;    // dash "off" length — just needs to exceed total path length

interface Geometry {
    width: number;
    height: number;
    d: string;
    emailOffset: number;
    emailWindow: number;
    passwordOffset: number;
    passwordWindow: number;
    submitOffset: number;
    submitWindow: number;
}

function buildGeometry(
    containerRect: DOMRect,
    emailRect: DOMRect,
    passwordRect: DOMRect,
    submitRect: DOMRect,
): Geometry {
    const toLocalX = (x: number) => x - containerRect.left;
    const toLocalY = (y: number) => y - containerRect.top;

    const emailLeft  = toLocalX(emailRect.left);
    const emailRight = toLocalX(emailRect.right);
    const emailY     = toLocalY(emailRect.bottom);

    const passwordLeft = toLocalX(passwordRect.left);
    const passwordY    = toLocalY(passwordRect.bottom);

    const ringLeft   = toLocalX(submitRect.left)  - RING_GAP;
    const ringRight  = toLocalX(submitRect.right) + RING_GAP;
    const ringTop    = toLocalY(submitRect.top)   - RING_GAP;
    const ringBottom = toLocalY(submitRect.bottom) + RING_GAP;
    const r = RING_RADIUS;

    // Segment A: email underline, drawn left -> right.
    const lenA = emailRight - emailLeft;

    // Connector: straight down from A's end to password's baseline.
    const lenConnector1 = passwordY - emailY;

    // Segment B: password underline, drawn right -> left (mirrors A).
    const lenB = emailRight - passwordLeft;

    // Connector: down + across, from B's end to the ring's starting corner.
    const ringStartX = ringLeft + r;
    const ringStartY = ringTop;
    const lenConnector2 = Math.abs(ringStartY - passwordY) + Math.abs(passwordLeft - ringStartX);

    // Segment C: full rounded-rectangle outline around the submit button.
    const ringWidth  = ringRight - ringLeft;
    const ringHeight = ringBottom - ringTop;
    const lenRing = 2 * (ringWidth - 2 * r) + 2 * (ringHeight - 2 * r) + 2 * Math.PI * r;

    const d =
        `M ${emailLeft},${emailY} H ${emailRight} ` +
        `V ${passwordY} H ${passwordLeft} ` +
        `V ${ringStartY} H ${ringStartX} ` +
        `H ${ringRight - r} ` +
        `A ${r},${r} 0 0 1 ${ringRight},${ringTop + r} ` +
        `V ${ringBottom - r} ` +
        `A ${r},${r} 0 0 1 ${ringRight - r},${ringBottom} ` +
        `H ${ringLeft + r} ` +
        `A ${r},${r} 0 0 1 ${ringLeft},${ringBottom - r} ` +
        `V ${ringTop + r} ` +
        `A ${r},${r} 0 0 1 ${ringLeft + r},${ringTop}`;

    return {
        width: containerRect.width,
        height: containerRect.height,
        d,
        emailOffset: 0,
        emailWindow: lenA,
        passwordOffset: -(lenA + lenConnector1),
        passwordWindow: lenB,
        submitOffset: -(lenA + lenConnector1 + lenB + lenConnector2),
        submitWindow: lenRing,
    };
}

export const SnakeFieldBorder = forwardRef<SnakeFieldBorderHandle, SnakeFieldBorderProps>(
    function SnakeFieldBorder({ containerRef, emailRef, passwordRef, submitRef }, ref) {
        const pathRef = useRef<SVGPathElement>(null);
        const animRef = useRef<ReturnType<typeof anime> | null>(null);
        const geometryRef = useRef<Geometry | null>(null);
        const activeStateRef = useRef<SnakeState>('email');
        const [geometry, setGeometry] = useState<Geometry | null>(null);

        const measure = useCallback(() => {
            const container = containerRef.current;
            const email = emailRef.current;
            const password = passwordRef.current;
            const submit = submitRef.current;
            if (!container || !email || !password || !submit) return;
            
            const g = buildGeometry(
            container.getBoundingClientRect(),
            email.getBoundingClientRect(),
            password.getBoundingClientRect(),
            submit.getBoundingClientRect(),
        );
        geometryRef.current = g;
        setGeometry(g);
    }, [containerRef, emailRef, passwordRef, submitRef]);

    useLayoutEffect(() => {
        measure();
        const ro = new ResizeObserver(measure);
        if (containerRef.current) ro.observe(containerRef.current);
        window.addEventListener('resize', measure);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [measure]);

    const applyState = useCallback((state: SnakeState, animated: boolean) => {
        const path = pathRef.current;
        const g = geometryRef.current;
        if (!path || !g) return;
        activeStateRef.current = state;

        const offset = state === 'email' ? g.emailOffset : state === 'password' ? g.passwordOffset : g.submitOffset;
        const windowLength = state === 'email' ? g.emailWindow : state === 'password' ? g.passwordWindow : g.submitWindow;

        if (!animated) {
            path.style.strokeDasharray = `${windowLength} ${BIG_GAP}`;
            path.style.strokeDashoffset = `${offset}`;
            return;
        }

        animRef.current?.pause();
        animRef.current = anime({
        targets: path,
        strokeDashoffset: { value: offset, duration: 700, easing: 'easeOutQuart' },
        strokeDasharray: { value: `${windowLength} ${BIG_GAP}`, duration: 700, easing: 'easeOutQuart' },
        });
    }, []);

    useEffect(() => {
        if (geometry) applyState(activeStateRef.current, false);
    }, [geometry, applyState]);

    useImperativeHandle(ref, () => ({
        highlight(state) {
        applyState(state, true);
        },
    }), [applyState]);

    if (!geometry) return null;

    return (
        <svg
            className="pointer-events-none absolute inset-0"
            width={geometry.width}
            height={geometry.height}
            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
            style={{ overflow: 'visible' }}
            aria-hidden="true"
        >
        <path
            ref={pathRef}
            d={geometry.d}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth={6}
            strokeLinecap="round"
            style={{ strokeDasharray: '0 1' }}
        />
        </svg>
        );
    }
);
