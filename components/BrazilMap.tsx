import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps';

interface BrazilMapProps {
    data: { name: string; value: number }[];
    onStateClick: (uf: string) => void;
}

// Public GeoJSON for Brazil States
const GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// Approximate centroids for state labels
const STATE_CENTROIDS: Record<string, [number, number]> = {
    'AC': [-70.55, -9.02],
    'AL': [-36.6, -9.57],
    'AM': [-64.6, -4.0],
    'AP': [-52.0, 1.0],
    'BA': [-41.7, -12.5],
    'CE': [-39.6, -5.20],
    'DF': [-47.92, -15.78],
    'ES': [-40.3, -19.7],
    'GO': [-50.0, -15.8],
    'MA': [-45.0, -5.0],
    'MG': [-44.6, -18.5],
    'MS': [-54.5, -20.3],
    'MT': [-56.0, -12.5],
    'PA': [-52.5, -4.0],
    'PB': [-36.6, -7.1],
    'PE': [-37.8, -8.3],
    'PI': [-42.5, -7.4],
    'PR': [-51.0, -24.5],
    'RJ': [-42.5, -22.0],
    'RN': [-36.5, -5.8],
    'RO': [-62.8, -10.8],
    'RR': [-61.3, 2.0],
    'RS': [-53.5, -29.5],
    'SC': [-51.0, -27.0],
    'SE': [-37.4, -10.6],
    'SP': [-48.5, -22.2],
    'TO': [-48.3, -10.2]
};

// Helper for linear color interpolation
const interpolateColor = (value: number, min: number, max: number, startColor: string, endColor: string) => {
    if (value <= min) return startColor;
    if (value >= max) return endColor;

    const ratio = (value - min) / (max - min);
    
    const hex = (color: string) => {
        const r = parseInt(color.substring(1, 3), 16);
        const g = parseInt(color.substring(3, 5), 16);
        const b = parseInt(color.substring(5, 7), 16);
        return [r, g, b];
    };

    const start = hex(startColor);
    const end = hex(endColor);

    const r = Math.round(start[0] * (1 - ratio) + end[0] * ratio);
    const g = Math.round(start[1] * (1 - ratio) + end[1] * ratio);
    const b = Math.round(start[2] * (1 - ratio) + end[2] * ratio);

    return `rgb(${r}, ${g}, ${b})`;
};

export const BrazilMap: React.FC<BrazilMapProps> = ({ data, onStateClick }) => {
    const dataMap = useMemo(() => {
        const map: Record<string, number> = {};
        data.forEach(d => { map[d.name] = d.value; });
        return map;
    }, [data]);

    const maxValue = useMemo(() => {
        return Math.max(...data.map(d => d.value), 1);
    }, [data]);

    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 750, 
                    center: [-54, -15]
                }}
                className="w-full h-full max-h-full"
                // Adding viewBox to help with responsiveness if needed, though react-simple-maps handles this
                viewBox="0 0 800 600"
            >
                <ZoomableGroup 
                    center={[-54, -15]} 
                    zoom={1}
                >
                    <Geographies geography={GEO_URL}>
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                // Try to find UF from properties (depends on geojson source)
                                // The source 'click_that_hood' uses 'sigla' property for UF
                                const uf = geo.properties.sigla || geo.properties.name; 
                                const value = dataMap[uf] || 0;
                                const fillColor = value > 0 
                                    ? interpolateColor(value, 0, maxValue, '#f9f1db', '#8a6515')
                                    : '#f3f4f6';

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onClick={() => {
                                            if (uf) onStateClick(uf);
                                        }}
                                        style={{
                                            default: {
                                                fill: fillColor,
                                                stroke: "#FFFFFF",
                                                strokeWidth: 0.75,
                                                outline: "none",
                                                transition: "all 0.3s ease"
                                            },
                                            hover: {
                                                fill: "#222222",
                                                stroke: "#dbaa3d",
                                                strokeWidth: 1,
                                                outline: "none",
                                                cursor: "pointer"
                                            },
                                            pressed: {
                                                fill: "#dbaa3d",
                                                outline: "none"
                                            }
                                        }}
                                    >
                                        <title>{`${uf}: ${value.toLocaleString()} empresas`}</title>
                                    </Geography>
                                );
                            })
                        }
                    </Geographies>

                    {/* State Labels */}
                    {Object.entries(STATE_CENTROIDS).map(([uf, coordinates]) => (
                        <Marker 
                            key={uf} 
                            coordinates={coordinates} 
                            onClick={() => onStateClick(uf)} 
                            style={{
                                default: { cursor: "pointer" },
                                hover: { cursor: "pointer" },
                                pressed: { cursor: "pointer" }
                            }}
                        >
                            <text
                                textAnchor="middle"
                                y={2}
                                style={{
                                    fontFamily: "Inter, sans-serif",
                                    fill: "#222",
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    pointerEvents: "none",
                                    textShadow: "0px 0px 3px rgba(255, 255, 255, 0.8)"
                                }}
                            >
                                {uf}
                            </text>
                        </Marker>
                    ))}
                </ZoomableGroup>
            </ComposableMap>
        </div>
    );
};