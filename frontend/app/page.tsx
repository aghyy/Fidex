"use client";

import { useState, useMemo, useCallback } from 'react'
import './globals.css'
import { LiquidGlass } from '@specy/liquid-glass-react'
import Image from 'next/image'
// Default values based on the core library
const DEFAULT_GLASS_STYLE = {
    depth: 20,
    segments: 86,
    radius: 20,
    tint: 0xdddddd as number | null,
    roughness: 0.2,
    transmission: 1,
    reflectivity: 0.9,
    ior: 2,
    thickness: 50,
    dispersion: 5,
} as const;

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    description?: string;
}

const images = [
    '/1.jpg',
    '/0.webp',
    '/3.jpg',
]


function Slider({ label, value, min, max, step, onChange, description }: SliderProps) {
    return (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid black', borderRadius: '8px', backdropFilter: 'blur(3px)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 'bold', color: '#333' }}>{label}</label>
                <span style={{ color: '#666', fontFamily: 'monospace' }}>{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '4px' }}
            />
            {description && (
                <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                    {description}
                </div>
            )}
        </div>
    );
}

function App() {
    // Background image state
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    //const [loading, setLoading] = useState(true);
    // Glass style state
    const [segments, setSegments] = useState<number>(DEFAULT_GLASS_STYLE.segments);
    const [radius, setRadius] = useState<number>(DEFAULT_GLASS_STYLE.radius);
    const [tint, setTint] = useState<number | null>(DEFAULT_GLASS_STYLE.tint);
    const [roughness, setRoughness] = useState<number>(DEFAULT_GLASS_STYLE.roughness);
    const [transmission, setTransmission] = useState<number>(DEFAULT_GLASS_STYLE.transmission);
    const [reflectivity, setReflectivity] = useState<number>(DEFAULT_GLASS_STYLE.reflectivity);
    const [ior, setIor] = useState<number>(DEFAULT_GLASS_STYLE.ior);
    const [thickness, setThickness] = useState<number>(DEFAULT_GLASS_STYLE.thickness);
    const [dispersion, setDispersion] = useState<number>(DEFAULT_GLASS_STYLE.dispersion);
    const [useTint, setUseTint] = useState(false);

    // Memoize the glass style object
    const glassStyle = useMemo(() => ({
        depth: radius,
        segments,
        radius,
        tint: useTint ? tint : 0xffffff,
        roughness,
        transmission,
        reflectivity,
        ior,
        thickness,
        dispersion,
    }), [segments, radius, tint, useTint, roughness, transmission, reflectivity, ior, thickness, dispersion]);

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        setSegments(DEFAULT_GLASS_STYLE.segments);
        setRadius(DEFAULT_GLASS_STYLE.radius);
        setTint(0xff0000); // Red tint for demo
        setUseTint(false);
        setRoughness(DEFAULT_GLASS_STYLE.roughness);
        setTransmission(DEFAULT_GLASS_STYLE.transmission);
        setReflectivity(DEFAULT_GLASS_STYLE.reflectivity);
        setIor(DEFAULT_GLASS_STYLE.ior);
        setThickness(DEFAULT_GLASS_STYLE.thickness);
        setDispersion(DEFAULT_GLASS_STYLE.dispersion);
    }, []);

    // Cycle through background images
    const cycleBackgroundImage = useCallback(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, []);

    return (
        <>
            <Image
                src="/pexels.jpg"
                alt="Background"
                fill
                className="object-cover"
                priority
            />
        <div className="app-container">
            {/* Background content for glass effect */}
            <div
                className="background-image"
                style={{
                    backgroundImage: `url(${images[currentImageIndex]})`,
                }}
            />

            <div className="content-container">

                <div className="layout-grid">

                    <LiquidGlass
                        glassStyle={glassStyle}
                        wrapperStyle={{
                            color: 'white',
                            maxWidth: '30rem',
                        }}
                        style={`border-radius: ${radius}px; text-shadow: 1px 1px 2px rgba(255,255,255,0.5); padding: fontWeight: bold;`}
                    >
                        <a target='_blank' href="https://www.npmjs.com/package/@specy/liquid-glass-react">
                            <h2 style={{ fontSize: '1.2rem', color: 'white', margin: 0, padding: '0.5rem', textShadow: 'rgba(0, 0, 0, 1) 1px 1px 3px' }}>
                                @specy/liquid-glass-react
                            </h2>
                        </a>

                        <div className="controls-panel">
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'center' }}>

                                <button
                                    onClick={resetToDefaults}
                                    className="btn btn-primary"
                                >
                                    Reset
                                </button>

                                <button
                                    onClick={cycleBackgroundImage}
                                    className="btn btn-success"
                                >
                                    Background {currentImageIndex + 1}/{images.length}
                                </button>
                            </div>

                            <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid black', borderRadius: '8px', backdropFilter: 'blur(3px)', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={useTint}
                                        onChange={(e) => setUseTint(e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                    />
                                    <span style={{ fontWeight: 'bold' }}>Enable Tint</span>
                                </label>
                                {useTint && (
                                    <input
                                        type="color"
                                        value={`#${(tint || 0xff0000).toString(16).padStart(6, '0')}`}
                                        onChange={(e) => setTint(parseInt(e.target.value.slice(1), 16))}
                                        style={{ width: '100%', height: '40px' }}
                                    />
                                )}
                                <div style={{ fontSize: '12px', fontStyle: 'italic' }}>
                                    Color tint applied to the glass material
                                </div>
                            </div>

                            <Slider
                                label="Radius & Depth"
                                value={radius}
                                min={0}
                                max={20}
                                step={1}
                                onChange={setRadius}
                                description="Border radius and depth of the glass shape"
                            />
                            <Slider
                                label="Roughness"
                                value={roughness}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={setRoughness}
                                description="Surface roughness (0 = mirror-like, 1 = completely rough)"
                            />
                            <Slider
                                label="Thickness"
                                value={thickness}
                                min={1}
                                max={100}
                                step={1}
                                onChange={setThickness}
                                description="Physical thickness of the glass material"
                            />
                            <Slider
                                label="Chromatic abberation"
                                value={dispersion}
                                min={0}
                                max={10}
                                step={0.1}
                                onChange={setDispersion}
                                description="Chromatic aberration (Also called dispersion, rainbow effect like a prism)"
                            />
                            <Slider
                                label="Reflectivity"
                                value={reflectivity}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={setReflectivity}
                                description="How reflective the surface is"
                            />

                            {/*
                        <Slider
                label="IOR (Index of Refraction)"
                value={ior}
                min={1}
                max={3}
                step={0.01}
                onChange={setIor}
                description="Controls light bending (1 = no bending, 1.5 = glass-like, 2.4 = diamond-like)"
              />
     <Slider
                label="Transmission"
                value={transmission}
                min={0}
                max={1}
                step={0.01}
                onChange={setTransmission}
                description="How much light passes through the glass (0 = opaque, 1 = fully transparent)"
              />
       
*/}



                            <Slider
                                label="Segments"
                                value={segments}
                                min={2}
                                max={128}
                                step={2}
                                onChange={setSegments}
                                description="Number of geometry segments (higher = smoother but more performance intensive)"
                            />
                        </div>
                    </LiquidGlass>

                    {/* Glass Demo Panel */}
                    <div className="demo-panel">
                        <a style={{display: 'flex', alignItems: 'end'}}  className="glass-demo-group" target="_blank" href='https://github.com/specy/liquid-glass'>
                            <LiquidGlass
                                glassStyle={glassStyle}
                                wrapperStyle={{
                                    color: 'white',

                                }}
                                //onReady={() => setLoading(false)}
                                key={`${currentImageIndex}-top`}
                                style={`aspect-ratio: 1; border-radius: ${radius}px; text-shadow: rgba(0, 0, 0, 1) 1px 1px 3px; padding: 0.8rem;`}
                            >
                                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', aspectRatio: 1 }}>
                                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'space-between' }}>
                                        <img src='/album.jpg' style={{ width: '60px', height: '60px', borderRadius: '0.4rem' }} alt="Album Cover" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div>
                                            Todays Hits
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                            Borderline
                                        </div>
                                    </div>

                                    <button style={{ textShadow: 'rgba(0, 0, 0, 1) 1px 1px 3px', padding: '0.25rem 1rem', borderRadius: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}>
                                        Star on github
                                    </button>
                                </div>
                            </LiquidGlass>
                            <LiquidGlass
                                glassStyle={glassStyle}
                                wrapperStyle={{
                                    color: 'white',
                                }}
                                key={`${currentImageIndex}-heart`}
                                style={`border-radius: ${radius}px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); padding: 0.5rem; textAlign: center; fontWeight: bold; height: 1.5rem; width: 1.5rem; font-size: 1.3rem`}
                            >
                            </LiquidGlass>

                        </a>

                    </div>
                </div>

            </div >
        </div >
        </>
    );
}

export default App