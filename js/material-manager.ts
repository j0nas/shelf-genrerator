import * as THREE from 'three';

export class MaterialManager {
    private static materialCache = new Map<string, THREE.Material>();
    
    private static readonly COLOR_MAP = {
        plywood: { main: 0xD2B48C, edge: 0x8B7355 },
        mdf: { main: 0xF5DEB3, edge: 0xDEB887 },
        pine: { main: 0xFFF8DC, edge: 0xF0E68C },
        oak: { main: 0xDEB887, edge: 0xCD853F },
        maple: { main: 0xFAF0E6, edge: 0xF5DEB3 }
    };

    static createMaterials(materialType: string) {
        const colors = this.COLOR_MAP[materialType] || this.COLOR_MAP.plywood;
        
        return {
            main: this.getOrCreateMaterial(`${materialType}-main`, () => 
                new THREE.MeshLambertMaterial({ 
                    color: colors.main,
                    transparent: true,
                    opacity: 0.9
                })
            ),
            edge: this.getOrCreateMaterial(`${materialType}-edge`, () =>
                new THREE.MeshLambertMaterial({ 
                    color: colors.edge,
                    transparent: true,
                    opacity: 0.95,
                    side: THREE.DoubleSide
                })
            )
        };
    }

    static createHighlightMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
        const cacheKey = `highlight-${color}-${opacity}`;
        return this.getOrCreateMaterial(cacheKey, () =>
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity,
                side: THREE.DoubleSide
            })
        ) as THREE.MeshBasicMaterial;
    }

    static createGhostMaterial(color: number): THREE.MeshBasicMaterial {
        const cacheKey = `ghost-${color}`;
        return this.getOrCreateMaterial(cacheKey, () =>
            new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
                depthTest: false
            })
        ) as THREE.MeshBasicMaterial;
    }

    private static getOrCreateMaterial<T extends THREE.Material>(
        key: string, 
        factory: () => T
    ): T {
        if (!this.materialCache.has(key)) {
            this.materialCache.set(key, factory());
        }
        return this.materialCache.get(key) as T;
    }

    static disposeMesh(mesh: any) {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat: any) => mat.dispose());
            } else {
                mesh.material.dispose();
            }
        }
    }

    static clearCache() {
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
    }
}