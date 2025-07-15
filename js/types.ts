/**
 * TypeScript interfaces for shelf generator application
 */
import * as THREE from 'three';

// Core data structures
export interface ShelfConfig {
    width: number;
    height: number;
    depth: number;
    materialThickness: number;
    materialType: string;
    shelfLayout: DividerInfo[]; // Horizontal dividers
    verticalDividers: VerticalDividerInfo[]; // Vertical dividers
    backPanel: boolean;
    edgeTreatment: string;
    woodGrain: boolean;
    units: 'imperial' | 'metric';
}

export interface HorizontalDividerInfo {
    dividerId?: string; // Optional for legacy compatibility
    id: string;
    position: number; // Y-position from bottom (0 to interiorHeight)
    mesh?: THREE.Object3D; // Optional for UI-only dividers
    intersection?: THREE.Intersection<THREE.Object3D>;
}

export interface VerticalDividerInfo {
    id: string;
    position: number; // X-position relative to shelf interior (-width/2 to +width/2)
    mesh?: THREE.Object3D; // Optional for UI-only dividers
    intersection?: THREE.Intersection<THREE.Object3D>;
}

// Legacy compatibility - keep existing interface name
export interface DividerInfo extends HorizontalDividerInfo {
    spaces?: {
        above: { verticalDividers: number };
        below: { verticalDividers: number };
    };
}

export interface SectionInfo {
    canAdd: boolean;
    centerPosition: number;
    topY: number;
    bottomY: number;
    heightInches: number;
}

// Cut list interfaces
export interface CutListPiece {
    name: string;
    width: number;
    height: number;
    depth: number;
    quantity: number;
    materialType: string;
    notes?: string;
}

export interface CutListData {
    pieces: CutListPiece[];
    materialSummary: MaterialSummary[];
    totalBoardFeet?: number;
    estimatedCost?: number;
}

export interface MaterialSummary {
    materialType: string;
    totalPieces: number;
    totalBoardFeet: number;
    estimatedCost: number;
}

// UI state interfaces
export interface ViewState {
    currentView: 'front' | 'side' | 'top' | 'iso';
    debugMode: boolean;
    cutListVisible: boolean;
}

// Three.js related types
export interface Ray3D {
    origin: THREE.Vector3;
    direction: THREE.Vector3;
}

export interface IntersectionResult {
    position: number;
    worldPoint: THREE.Vector3;
    units: 'imperial' | 'metric';
}

// Event handler types
export type UnitChangeHandler = (units: 'imperial' | 'metric') => void;
export type DimensionChangeHandler = (dimension: keyof ShelfConfig, value: number) => void;
export type MaterialChangeHandler = (property: string, value: any) => void;

// XState context types (for compatibility)
export interface DividerContext {
    selectedDivider: DividerInfo | null;
    hoveredDivider: DividerInfo | null;
    dragStartPosition: { x: number; y: number } | null;
}

// Note: Window interface extensions are declared in main.ts to avoid conflicts